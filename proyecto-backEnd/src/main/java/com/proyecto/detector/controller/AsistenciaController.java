package com.proyecto.detector.controller;

import com.proyecto.detector.model.Asistencia;
import com.proyecto.detector.model.Empleado;
import com.proyecto.detector.repository.AsistenciaRepository;
import com.proyecto.detector.repository.EmpleadoRepository;
import com.proyecto.detector.service.IAAdapterService;
import com.proyecto.detector.service.PocketBaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/asistencias")
@CrossOrigin(origins = "*")
public class AsistenciaController {

    @Autowired private AsistenciaRepository asistenciaRepository;
    @Autowired private EmpleadoRepository empleadoRepository;
    @Autowired private PocketBaseService pocketBaseService;
    @Autowired private IAAdapterService iaAdapterService;

    @PostMapping("/marcar")
    public ResponseEntity<?> marcarAsistencia(@RequestBody MarcarRequest request) {
        try {
            // 1. Buscar si el empleado existe en PostgreSQL
            Optional<Empleado> empOpt = empleadoRepository.findById(request.getEmpleadoId());
            if (empOpt.isEmpty()) {
                return ResponseEntity.status(404).body("Error: Empleado no registrado en el sistema.");
            }
            Empleado empleado = empOpt.get();

            // 2. REGLA: No registrar dos veces el mismo día (Lo hacemos ANTES de la IA para ahorrar recursos)
            LocalDateTime inicioDia = LocalDate.now().atStartOfDay();
            LocalDateTime finDia = LocalDate.now().atTime(LocalTime.MAX);

            if (asistenciaRepository.existsByEmpleadoIdAndFechaHoraBetween(empleado.getId(), inicioDia, finDia)) {
                return ResponseEntity.status(400).body("Acceso denegado: Ya registraste tu asistencia el día de hoy.");
            }

            // 3. Traer las fotos seguras desde PocketBase
            List<String> fotosDataset = pocketBaseService.obtenerFotosBase64(empleado.getRutaDataset());

            // 4. PATRÓN ADAPTER: Consultar al microservicio de Python
            boolean esValido = iaAdapterService.verificarRostro(request.getFotoBase64(), fotosDataset);

            if (!esValido) {
                return ResponseEntity.status(401).body("Acceso denegado: Rostro no coincide con la identidad.");
            }

            // 5. Si la IA dice que es válido y no había marcado hoy, guardamos la asistencia real
            Asistencia nuevaAsistencia = new Asistencia();
            nuevaAsistencia.setEmpleadoId(empleado.getId());

            LocalDateTime ahora = LocalDateTime.now();
            nuevaAsistencia.setFechaHora(ahora);

            // REGLA DE NEGOCIO: Si llega después de las 08:00:59, es "Tarde"
            if (ahora.toLocalTime().isAfter(LocalTime.of(8, 0, 59))) {
                nuevaAsistencia.setEstado("Tarde");
                nuevaAsistencia.setMulta(5.00);
            } else {
                nuevaAsistencia.setEstado("Puntual");
                nuevaAsistencia.setMulta(0.00);
            }

            asistenciaRepository.save(nuevaAsistencia);

            return ResponseEntity.ok(nuevaAsistencia);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error interno del servidor: " + e.getMessage());
        }
    }

    @GetMapping("/todas")
    public List<Asistencia> obtenerTodas() {
        return asistenciaRepository.findAll();
    }

    // Endpoint especializado para los gráficos (Actualizado con los nuevos estados)
    @GetMapping("/estadisticas")
    public ResponseEntity<Map<String, Long>> obtenerResumen() {
        List<Asistencia> asistencias = asistenciaRepository.findAll();

        long puntuales = asistencias.stream().filter(a -> "Puntual".equals(a.getEstado())).count();
        long atrasos = asistencias.stream().filter(a -> "Tarde".equals(a.getEstado())).count();

        Map<String, Long> resumen = new HashMap<>();
        resumen.put("puntuales", puntuales);
        resumen.put("atrasos", atrasos);
        resumen.put("total", (long) asistencias.size());

        return ResponseEntity.ok(resumen);
    }
}

class MarcarRequest {
    private String empleadoId;
    private String fotoBase64;

    // Getters y Setters
    public String getEmpleadoId() { return empleadoId; }
    public void setEmpleadoId(String empleadoId) { this.empleadoId = empleadoId; }
    public String getFotoBase64() { return fotoBase64; }
    public void setFotoBase64(String fotoBase64) { this.fotoBase64 = fotoBase64; }
}
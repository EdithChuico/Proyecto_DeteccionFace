package com.proyecto.detector.controller;

import com.proyecto.detector.model.Asistencia;
import com.proyecto.detector.model.Empleado;
import com.proyecto.detector.repository.AsistenciaRepository;
import com.proyecto.detector.repository.EmpleadoRepository;
import com.proyecto.detector.service.IAAdapterService;
import com.proyecto.detector.service.PocketBaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
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
            Optional<Empleado> empOpt = empleadoRepository.findById(request.getEmpleadoId());
            if (empOpt.isEmpty()) {
                return ResponseEntity.status(404).body("Error: Empleado no registrado en el sistema.");
            }
            Empleado empleado = empOpt.get();

            String tipoMarcacion = request.getTipoMarcacion() != null && !request.getTipoMarcacion().trim().isEmpty()
                    ? request.getTipoMarcacion().toUpperCase()
                    : "ENTRADA";

            LocalDateTime ahora = LocalDateTime.now();
            int hora = ahora.getHour();
            int minuto = ahora.getMinute();

            // 1. VALIDACIÓN GENERAL: Madrugada bloqueada
            if (hora >= 0 && hora < 5) {
                return ResponseEntity.status(400).body("Registro rechazado: No se permiten marcaciones en horario de madrugada.");
            }

            // 2. VALIDACIÓN DE DUPLICADOS (Aplica para todo excepto SALIDA_JUSTIFICADA)
            LocalDateTime inicioDia = LocalDate.now().atStartOfDay();
            LocalDateTime finDia = LocalDate.now().atTime(LocalTime.MAX);

            if (!"SALIDA_JUSTIFICADA".equals(tipoMarcacion)) {
                if (asistenciaRepository.existsByEmpleadoIdAndTipoMarcacionAndFechaHoraBetween(empleado.getId(), tipoMarcacion, inicioDia, finDia)) {
                    return ResponseEntity.status(400).body("Acceso denegado: Ya registraste tu " + tipoMarcacion + " el día de hoy.");
                }
            }

            // 3. Traer fotos seguras desde PocketBase e Inteligencia Artificial
            List<String> fotosDataset = pocketBaseService.obtenerFotosBase64(empleado.getRutaDataset());
            boolean esValido = iaAdapterService.verificarRostro(request.getFotoBase64(), fotosDataset);

            if (!esValido) {
                return ResponseEntity.status(401).body("Acceso denegado: Rostro no coincide con la identidad.");
            }

            // ====================================================================
            // 4. LÓGICA DE NEGOCIO Y MULTAS INTELIGENTES
            // ====================================================================
            String estado = "Registrado";
            double multa = 0.0;

            if ("ENTRADA".equals(tipoMarcacion)) {
                int horaOficial = 8;
                int minutoOficial = 0;
                int toleranciaMinutos = 10;

                int minutosTotalesActual = (hora * 60) + minuto;
                int minutosTotalesOficial = (horaOficial * 60) + minutoOficial + toleranciaMinutos;

                if (minutosTotalesActual > minutosTotalesOficial) {
                    int minutosDeRetraso = minutosTotalesActual - (horaOficial * 60 + minutoOficial);
                    estado = "Tarde";
                    if (minutosDeRetraso <= 30) multa = 2.00;
                    else if (minutosDeRetraso <= 60) multa = 5.00;
                    else multa = 10.00;
                } else {
                    estado = "Puntual";
                }

            } else if ("SALIDA_ALMUERZO".equals(tipoMarcacion)) {
                // REGLA: El almuerzo solo se puede tomar entre las 12:00 PM y las 14:59 PM (antes de las 3)
                if (hora < 12 || hora >= 15) {
                    return ResponseEntity.status(400).body("Registro rechazado: La salida al almuerzo solo está habilitada entre las 12:00 PM y las 3:00 PM.");
                }
                estado = "Registrado";
                multa = 0.0;

            } else if ("REGRESO_ALMUERZO".equals(tipoMarcacion)) {
                // REGLA: Buscar a qué hora salió y calcular si se tardó más de 60 minutos
                Optional<Asistencia> salidaOpt = asistenciaRepository.findFirstByEmpleadoIdAndTipoMarcacionAndFechaHoraBetweenOrderByFechaHoraDesc(
                        empleado.getId(), "SALIDA_ALMUERZO", inicioDia, finDia
                );

                if (salidaOpt.isEmpty()) {
                    return ResponseEntity.status(400).body("Registro rechazado: No puedes regresar del almuerzo sin haber marcado tu salida previa hoy.");
                }

                // Cronómetro: Diferencia entre la salida y el momento actual
                long minutosTomados = Duration.between(salidaOpt.get().getFechaHora(), ahora).toMinutes();

                if (minutosTomados > 120) {
                    estado = "Atraso Almuerzo";
                    long minutosRetraso = minutosTomados - 120;

                    if (minutosRetraso <= 15) multa = 2.00; // Se pasó por poco
                    else if (minutosRetraso <= 30) multa = 5.00; // Se pasó por media hora
                    else multa = 10.00; // Se pasó demasiado
                } else {
                    estado = "A Tiempo";
                }
            } else {
                estado = "Registrado";
                multa = 0.0;
            }

            // 5. Guardar la asistencia
            Asistencia nuevaAsistencia = new Asistencia();
            nuevaAsistencia.setEmpleadoId(empleado.getId());
            nuevaAsistencia.setFechaHora(ahora);
            nuevaAsistencia.setTipoMarcacion(tipoMarcacion);
            nuevaAsistencia.setEstado(estado);
            nuevaAsistencia.setMulta(multa);

            asistenciaRepository.save(nuevaAsistencia);

            return ResponseEntity.ok(Map.of(
                    "mensaje", "Marcación registrada exitosamente",
                    "tipo", tipoMarcacion,
                    "estado", estado,
                    "multa", multa
            ));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error interno del servidor: " + e.getMessage());
        }
    }

    @GetMapping("/todas")
    public List<Asistencia> obtenerTodas() {
        return asistenciaRepository.findAll();
    }

    @GetMapping("/deuda/{empleadoId}")
    public ResponseEntity<?> obtenerDeuda(@PathVariable String empleadoId) {
        if (!empleadoRepository.existsById(empleadoId)) {
            return ResponseEntity.status(404).body(Map.of("mensaje", "Empleado no encontrado."));
        }

        double total = Optional.ofNullable(asistenciaRepository.sumarMultasPorEmpleado(empleadoId)).orElse(0.0);
        return ResponseEntity.ok(Map.of("empleadoId", empleadoId, "total", total));
    }

    @PostMapping("/pagar/{empleadoId}")
    public ResponseEntity<?> limpiarDeuda(@PathVariable String empleadoId) {
        if (!empleadoRepository.existsById(empleadoId)) {
            return ResponseEntity.status(404).body(Map.of("mensaje", "Empleado no encontrado."));
        }

        try {
            // Buscamos todas las asistencias de ese empleado
            List<Asistencia> asistencias = asistenciaRepository.findByEmpleadoId(empleadoId);

            // Recorremos y ponemos la multa en 0
            for (Asistencia a : asistencias) {
                a.setMulta(0.0);
            }
            // Guardamos los cambios en PostgreSQL
            asistenciaRepository.saveAll(asistencias);

            return ResponseEntity.ok(Map.of(
                    "mensaje", "Deuda liquidada exitosamente",
                    "totalPendiente", 0
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("mensaje", "Error al limpiar la deuda"));
        }
    }
    @GetMapping("/estadisticas")
    public ResponseEntity<Map<String, Long>> obtenerResumen() {
        List<Asistencia> asistencias = asistenciaRepository.findAll();

        long puntuales = asistencias.stream().filter(a -> "Puntual".equals(a.getEstado()) || "A Tiempo".equals(a.getEstado())).count();
        long atrasos = asistencias.stream().filter(a -> "Tarde".equals(a.getEstado()) || "Atraso Almuerzo".equals(a.getEstado())).count();

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
    private String tipoMarcacion;

    public String getEmpleadoId() { return empleadoId; }
    public void setEmpleadoId(String empleadoId) { this.empleadoId = empleadoId; }

    public String getFotoBase64() { return fotoBase64; }
    public void setFotoBase64(String fotoBase64) { this.fotoBase64 = fotoBase64; }

    public String getTipoMarcacion() { return tipoMarcacion; }
    public void setTipoMarcacion(String tipoMarcacion) { this.tipoMarcacion = tipoMarcacion; }
}
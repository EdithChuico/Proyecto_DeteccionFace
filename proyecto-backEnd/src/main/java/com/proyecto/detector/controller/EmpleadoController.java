package com.proyecto.detector.controller;

import com.proyecto.detector.model.AuditoriaCambio;
import com.proyecto.detector.model.Empleado;
import com.proyecto.detector.repository.AuditoriaCambioRepository;
import com.proyecto.detector.repository.EmpleadoRepository;
import com.proyecto.detector.service.PocketBaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/empleados")
@CrossOrigin(origins = "*")
public class EmpleadoController {

    @Autowired
    private EmpleadoRepository empleadoRepository;
    @Autowired
    private AuditoriaCambioRepository auditoriaCambioRepository;
    @Autowired
    private PocketBaseService pocketBaseService;

    @PostMapping("/enrolar")
    public synchronized ResponseEntity<String> registrarEmpleado(@RequestBody EnrolarRequest request) {
        try {
            // Verificamos antes de gastar internet subiendo cosas
            if (empleadoRepository.existsById(request.getEmpleadoId())) {
                return ResponseEntity.badRequest().body("El empleado ya está registrado. Para actualizar sus fotos, debe eliminarlo primero del sistema.");
            }

            // 2. Decodificar la ráfaga de fotos (De Base64 a Bytes)
            List<byte[]> fotosDecodificadas = new ArrayList<>();
            for (String fotoBase64 : request.getFotosBase64()) {
                String base64Limpio = fotoBase64.split(",")[1];
                fotosDecodificadas.add(Base64.getDecoder().decode(base64Limpio));
            }

            // 3. Subimos a PocketBase y capturamos la URL generada
            String urlPocketBase = pocketBaseService.crearRegistroEmpleado(
                    request.getEmpleadoId(), request.getNombre(), fotosDecodificadas
            );
            Empleado nuevoEmpleado = new Empleado();
            nuevoEmpleado.setId(request.getEmpleadoId());
            nuevoEmpleado.setNombre(request.getNombre());
            nuevoEmpleado.setRutaDataset(urlPocketBase);

            empleadoRepository.save(nuevoEmpleado);

            return ResponseEntity.ok("Empleado enrolado y fotos blindadas en la nube.");

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error en la transacción: " + e.getMessage());
        }
    }
    // En EmpleadoController.java
    @GetMapping("/todos")
    public List<Empleado> obtenerTodosLosEmpleados() {
        return empleadoRepository.findAll();
    }
    @PutMapping("/actualizar/{id}")
    public ResponseEntity<?> actualizarEmpleado(
            @PathVariable String id,
            @RequestBody EmpleadoModificarRequest request) {
        try {
            Optional<Empleado> empOpt = empleadoRepository.findById(id);
            if (empOpt.isEmpty()) {
                return ResponseEntity.status(404).body("Empleado no encontrado.");
            }

            Empleado empleado = empOpt.get();
            String datosAnteriores = String.format("Nombre: %s, Estado: %s", empleado.getNombre(), empleado.getEstado());

            // Aplicar modificaciones
            empleado.setNombre(request.getNombre());
            empleado.setEstado(request.getEstado()); // "Activo" o "Inactivo"

            // Si tu ID/Cédula es la clave primaria y necesitas cambiarla,
            // lo ideal en JPA es guardar un nuevo registro o manejarlo si no es la PK nativa.
            // Asumiendo que es modificable:
            // empleado.setId(request.getNuevoId());

            empleadoRepository.save(empleado);

            // ✨ REGISTRO DE AUDITORÍA CRÍTICO
            String detalleAccion = String.format("Modificó empleado ID #%s. Antes: [%s] -> Ahora: [Nombre: %s, Estado: %s]",
                    id, datosAnteriores, request.getNombre(), request.getEstado());

            AuditoriaCambio auditoria = new AuditoriaCambio(
                    detalleAccion,
                    request.getModificadoPor(), // Viene desde el localStorage de React
                    LocalDateTime.now()
            );
            auditoriaCambioRepository.save(auditoria);

            return ResponseEntity.ok(empleado);

        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error interno al actualizar datos.");
        }
    }
}
class EmpleadoModificarRequest {
    private String nombre;
    private String estado;
    private String modificadoPor;

    // Getters y Setters
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public String getModificadoPor() { return modificadoPor; }
    public void setModificadoPor(String modificadoPor) { this.modificadoPor = modificadoPor; }
}
// Recibe una Lista de fotos en vez de una sola
class EnrolarRequest {
    private String empleadoId;
    private String nombre;
    private List<String> fotosBase64;

    public String getEmpleadoId() { return empleadoId; }
    public void setEmpleadoId(String empleadoId) { this.empleadoId = empleadoId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public List<String> getFotosBase64() { return fotosBase64; }
    public void setFotosBase64(List<String> fotosBase64) { this.fotosBase64 = fotosBase64; }
}

package com.proyecto.detector.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.proyecto.detector.service.AsistenciaService;

@RestController
@RequestMapping("/api/asistencias")
@CrossOrigin(origins = "*") // Para que React (localhost:3000) pueda comunicarse
public class AsistenciaController {

    @Autowired
    private AsistenciaService asistenciaService;

    // ENDPOINT PARA EL EMPLEADO (El que dispara el hilo)
    @PostMapping("/marcar")
    public ResponseEntity<String> marcarAsistencia(@RequestBody MarcarRequest request) {
        // Retornamos un "Estado Pendiente" inmediatamente (Teorema CAP: Consistencia)
        // Y delegamos el procesamiento pesado al hilo en segundo plano
        asistenciaService.procesarAsistenciaFacial(request.getEmpleadoId(), request.getFotoBase64());

        return ResponseEntity.accepted().body("Validación facial en proceso...");
    }

    // --- ENDPOINTS CRUD PARA EL ADMIN ---
    @GetMapping
    public ResponseEntity<?> obtenerTodosLosRegistros() {
        // Aquí iría: return ResponseEntity.ok(repository.findAll());
        return ResponseEntity.ok("Devolviendo lista de asistencias (Simulado)");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarRegistro(@PathVariable Long id) {
        // Aquí iría la lógica para borrar una asistencia falsa
        return ResponseEntity.ok("Registro eliminado correctamente");
    }
}

// Clase de apoyo para recibir el JSON
class MarcarRequest {

    private String empleadoId;
    private String fotoBase64;

    // Getters y Setters
    public String getEmpleadoId() {
        return empleadoId;
    }

    public void setEmpleadoId(String empleadoId) {
        this.empleadoId = empleadoId;
    }

    public String getFotoBase64() {
        return fotoBase64;
    }

    public void setFotoBase64(String fotoBase64) {
        this.fotoBase64 = fotoBase64;
    }
}

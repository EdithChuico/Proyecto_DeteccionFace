package com.proyecto.detector.controller;

import java.util.Base64;
import com.proyecto.detector.model.Empleado;
import com.proyecto.detector.repository.EmpleadoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.io.FileOutputStream;
import java.util.UUID;

@RestController
@RequestMapping("/api/empleados")
@CrossOrigin(origins = "*")
public class EmpleadoController {

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @PostMapping("/enrolar")
    public synchronized ResponseEntity<String> registrarEmpleado(@RequestBody EnrolarRequest request) {
        try {
            // 1. ¡LA NUEVA BARRERA DE SEGURIDAD!
            // Verificamos antes de gastar internet subiendo cosas
            if (empleadoRepository.existsById(request.getEmpleadoId())) {
                return ResponseEntity.badRequest().body("El empleado ya está registrado. Para actualizar sus fotos, debe eliminarlo primero del sistema.");
            }

            if (!empleadoRepository.existsById(request.getEmpleadoId())) {
                Empleado nuevo = new Empleado();
                nuevo.setId(request.getEmpleadoId());
                nuevo.setNombre(request.getNombre());
                nuevo.setRutaDataset("dataset/train/" + request.getEmpleadoId());
                empleadoRepository.save(nuevo);
            }

            String base64Image = request.getFotoBase64().split(",")[1];
            byte[] imageBytes = Base64.getDecoder().decode(base64Image);

            String nombreFoto = carpetaDestinoFinal + "/foto_" + UUID.randomUUID().toString().substring(0, 8) + ".jpg";
            try (FileOutputStream fos = new FileOutputStream(nombreFoto)) {
                fos.write(imageBytes);
            }

            return ResponseEntity.ok("Foto organizada en: " + carpetaDestinoFinal);

        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error al organizar el dataset: " + e.getMessage());
        }
    }
}

// DTO para recibir los datos desde React (ESTO ERA LO QUE FALTABA)
class EnrolarRequest {
    private String empleadoId;
    private String nombre;
    private String fotoBase64;

    // Getters y Setters
    public String getEmpleadoId() { return empleadoId; }
    public void setEmpleadoId(String empleadoId) { this.empleadoId = empleadoId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getFotoBase64() { return fotoBase64; }
    public void setFotoBase64(String fotoBase64) { this.fotoBase64 = fotoBase64; }
}
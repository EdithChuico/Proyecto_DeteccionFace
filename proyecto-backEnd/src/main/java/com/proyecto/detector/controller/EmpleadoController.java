package com.proyecto.detector.controller;

import com.proyecto.detector.model.Empleado;
import com.proyecto.detector.repository.EmpleadoRepository;
import com.proyecto.detector.service.PocketBaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@RestController
@RequestMapping("/api/empleados")
@CrossOrigin(origins = "*")
public class EmpleadoController {

    @Autowired
    private EmpleadoRepository empleadoRepository;

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

            // 4. Creamos el empleado en PostgreSQL con la URL real
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
}

// DTO Actualizado: Ahora recibe una Lista de fotos en vez de una sola
class EnrolarRequest {
    private String empleadoId;
    private String nombre;
    private List<String> fotosBase64; // <--- Cambiado a Lista

    public String getEmpleadoId() { return empleadoId; }
    public void setEmpleadoId(String empleadoId) { this.empleadoId = empleadoId; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public List<String> getFotosBase64() { return fotosBase64; }
    public void setFotosBase64(List<String> fotosBase64) { this.fotosBase64 = fotosBase64; }
}
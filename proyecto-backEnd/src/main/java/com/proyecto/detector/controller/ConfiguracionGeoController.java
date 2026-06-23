package com.proyecto.detector.controller;

import com.proyecto.detector.model.ConfiguracionGeo;
import com.proyecto.detector.repository.ConfiguracionGeoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/configuracion")
@CrossOrigin(origins = "*")
public class ConfiguracionGeoController {

    @Autowired
    private ConfiguracionGeoRepository configRepository;

    // Obtener la ubicación configurada (Usado por el Empleado)
    @GetMapping
    public ResponseEntity<ConfiguracionGeo> obtenerConfiguracion() {
        ConfiguracionGeo config = configRepository.findById("MAIN_CONFIG")
                .orElse(new ConfiguracionGeo()); // Si no existe, devuelve valores en 0
        return ResponseEntity.ok(config);
    }

    // Guardar o Actualizar la ubicación
    @PostMapping
    public ResponseEntity<String> guardarConfiguracion(@RequestBody ConfiguracionGeo nuevaConfig) {
        nuevaConfig.setId("MAIN_CONFIG"); // Forzamos a que siempre reescriba el mismo registro
        configRepository.save(nuevaConfig);
        return ResponseEntity.ok("Configuración de geocerca actualizada con éxito en PostgreSQL");
    }
}
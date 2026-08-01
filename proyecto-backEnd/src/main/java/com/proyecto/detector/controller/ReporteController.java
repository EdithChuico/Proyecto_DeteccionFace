package com.proyecto.detector.controller;

import com.proyecto.detector.service.ReporteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/reportes")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class ReporteController {

    @Autowired
    private ReporteService reporteService;

    @PostMapping("/enviar")
    public ResponseEntity<?> enviarReportesMensuales(@RequestBody Map<String, Object> request) {
        String empleadoId = request.get("empleadoId").toString();
        int mes = Integer.parseInt(request.get("mes").toString());
        int anio = Integer.parseInt(request.get("anio").toString());
        reporteService.generarYEnviarReportes(empleadoId, mes, anio);

        return ResponseEntity.accepted().body("Proceso de generación y envío de PDFs iniciado en segundo plano.");
    }
}
package com.proyecto.detector.service;

import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class IAAdapterService {

    private final RestTemplate restTemplate = new RestTemplate();
    // La URL de tu microservicio Flask en Python
    private final String flaskUrl = "http://127.0.0.1:5000/api/ia/verificar";

    // PATRÓN ADAPTER: Traduce la estructura de Java al JSON que Python DeepFace espera
    public boolean verificarRostro(String fotoActualBase64, List<String> fotosBaseDatosBase64) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> payload = new HashMap<>();
        payload.put("fotoActual", fotoActualBase64);
        payload.put("fotosBaseDatos", fotosBaseDatosBase64);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        try {
            // Mandamos los datos a Python
            ResponseEntity<Map> response = restTemplate.postForEntity(flaskUrl, request, Map.class);

            // Si Python responde OK (200), extraemos el booleano "reconocido"
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Boolean reconocido = (Boolean) response.getBody().get("reconocido");
                return reconocido != null && reconocido;
            }
        } catch (Exception e) {
            System.err.println(" La IA rechazó el rostro o falló: " + e.getMessage());
        }
        return false; // Si hay error o no se parece, bloquea el acceso
    }
}
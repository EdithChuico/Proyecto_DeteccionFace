package com.proyecto.detector.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class PocketBaseService {

    @Value("${pocketbase.url}")
    private String pocketbaseUrl;

    @Value("${pocketbase.admin.email}")
    private String adminEmail;

    @Value("${pocketbase.admin.password}")
    private String adminPassword;

    private final RestTemplate restTemplate = new RestTemplate();

    // 1. Autenticación Interna (Actualizado para PocketBase v0.23+)
    private String obtenerTokenAdmin() {
        // ✨ ¡Aquí está la magia! La nueva ruta para superusuarios
        String url = pocketbaseUrl + "/api/collections/_superusers/auth-with-password";
        Map<String, String> credenciales = Map.of(
                "identity", adminEmail,
                "password", adminPassword
        );

        ResponseEntity<Map> response = restTemplate.postForEntity(url, credenciales, Map.class);
        return (String) response.getBody().get("token");
    }

    // 2. Subida Segura Multipart
    // 2. Subida Segura Multipart (Ahora devuelve la URL del registro)
    public String crearRegistroEmpleado(String empleadoId, String nombre, List<byte[]> imagenesBase64Decodificadas) {
        String token = obtenerTokenAdmin();
        String url = pocketbaseUrl + "/api/collections/empleados_ia/records";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setBearerAuth(token); // Candado de seguridad puesto

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("empleado_id", empleadoId);
        body.add("nombre", nombre);

        for (int i = 0; i < imagenesBase64Decodificadas.size(); i++) {
            final String nombreArchivo = "foto_" + empleadoId + "_" + i + ".jpg";
            ByteArrayResource recursoImagen = new ByteArrayResource(imagenesBase64Decodificadas.get(i)) {
                @Override
                public String getFilename() { return nombreArchivo; }
            };
            body.add("fotos", recursoImagen);
        }

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            // Recibimos la respuesta de PocketBase como un Mapa (JSON)
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, requestEntity, Map.class);

            // Extraemos el ID único que PocketBase le asignó a este registro
            String pocketBaseRecordId = (String) response.getBody().get("id");

            // Retornamos la URL oficial (API REST) que la IA usará para consultar las fotos
            return pocketbaseUrl + "/api/collections/empleados_ia/records/" + pocketBaseRecordId;

        } catch (Exception e) {
            throw new RuntimeException("Error crítico subiendo a PocketBase: " + e.getMessage());
        }
    }
    // 3. Descargar fotos para validación (Extrae de la nube y las pasa a Base64)
    public List<String> obtenerFotosBase64(String recordUrl) {
        String token = obtenerTokenAdmin();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            // A. Obtener el registro para saber los nombres de las fotos
            ResponseEntity<Map> response = restTemplate.exchange(recordUrl, HttpMethod.GET, entity, Map.class);
            Map<String, Object> record = response.getBody();
            String collectionId = (String) record.get("collectionId");
            String recordId = (String) record.get("id");
            List<String> nombresArchivos = (List<String>) record.get("fotos");

            List<String> fotosBase64 = new java.util.ArrayList<>();
            // B. Descargar cada foto desde el Storage privado y convertirla
            for (String nombreArchivo : nombresArchivos) {
                String fileUrl = pocketbaseUrl + "/api/files/" + collectionId + "/" + recordId + "/" + nombreArchivo;
                ResponseEntity<byte[]> fileResponse = restTemplate.exchange(fileUrl, HttpMethod.GET, entity, byte[].class);
                String base64 = java.util.Base64.getEncoder().encodeToString(fileResponse.getBody());
                fotosBase64.add("data:image/jpeg;base64," + base64);
            }
            return fotosBase64;
        } catch (Exception e) {
            throw new RuntimeException("Error descargando fotos del Storage: " + e.getMessage());
        }
    }
}
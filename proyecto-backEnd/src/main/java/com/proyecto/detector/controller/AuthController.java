package com.proyecto.detector.controller;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.proyecto.detector.model.UsuarioAdmin;
import com.proyecto.detector.repository.UsuarioAdminRepository;
import com.proyecto.detector.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    @Value("${google.client.id}")
    private String googleClientId;

    @Autowired
    private UsuarioAdminRepository usuarioAdminRepository;

    @Autowired
    private JwtUtil jwtUtil;

    private final String CORREO_ADMIN_AUTORIZADO = "elchuico@espe.edu.ec";

    // ==========================================
    // IDENTIDAD GOOGLE OAUTH
    // ==========================================
    @PostMapping("/google")
    public ResponseEntity<?> autenticarConGoogle(@RequestBody Map<String, String> request) {
        try {
            String idTokenString = request.get("token");

            if (idTokenString == null || idTokenString.isEmpty()) {
                return ResponseEntity.badRequest().body("Token ausente o inválido.");
            }

            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(idTokenString);

            if (idToken != null) {
                GoogleIdToken.Payload payload = idToken.getPayload();
                String email = payload.getEmail();
                String name = (String) payload.get("name");
                String pictureUrl = (String) payload.get("picture");

                if (!CORREO_ADMIN_AUTORIZADO.equalsIgnoreCase(email)) {
                    return ResponseEntity.status(403).body("Acceso denegado: El correo no está registrado como administrador.");
                }

                // ✨ GENERAR JWT TAMBIÉN PARA GOOGLE
                String tokenGenerado = jwtUtil.generarToken(email);

                Map<String, Object> respuestaSesion = new HashMap<>();
                respuestaSesion.put("autenticado", true);
                respuestaSesion.put("token", tokenGenerado); // <-- JWT incluido
                respuestaSesion.put("nombre", name);
                respuestaSesion.put("email", email);
                respuestaSesion.put("foto", pictureUrl);
                respuestaSesion.put("rol", "ADMINISTRADOR");

                return ResponseEntity.ok(respuestaSesion);
            } else {
                return ResponseEntity.status(401).body("Token de Google inválido o expirado.");
            }

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error interno durante la verificación de identidad.");
        }
    }

    // ==================================
    // AUTENTICACION TRADICIONAL
    // ==================================
    @PostMapping("/login")
    public ResponseEntity<?> autenticarConPassword(@RequestBody LoginFormRequest request) {
        logger.info("POST /login - Intento de inicio de sesión para: {}", request.getCorreo());
        try {
            String correoLimpio = request.getCorreo().trim().toLowerCase();
            String password = request.getPassword();
            logger.info("POST /login - Inicio de sesión exitoso");

            if (!correoLimpio.endsWith("@espe.edu.ec")) {
                return ResponseEntity.status(403).body("Solo se permiten cuentas @espe.edu.ec");
            }

            Optional<UsuarioAdmin> adminOpt = usuarioAdminRepository.findByCorreo(correoLimpio);
            if (adminOpt.isEmpty() || !adminOpt.get().getPassword().equals(password)) {
                return ResponseEntity.status(401).body("Credenciales incorrectas.");
            }

            UsuarioAdmin admin = adminOpt.get();
            String tokenGenerado = jwtUtil.generarToken(admin.getCorreo());

            Map<String, Object> respuestaSesion = new HashMap<>();
            respuestaSesion.put("autenticado", true);
            respuestaSesion.put("token", tokenGenerado);
            respuestaSesion.put("nombre", admin.getNombre());
            respuestaSesion.put("rol", "ADMINISTRADOR");

            return ResponseEntity.ok(respuestaSesion);

        } catch (Exception e) {
            e.printStackTrace();
            logger.error("POST /login - Error interno: {}", e.getMessage());
            return ResponseEntity.status(500).body("Error en el servidor.");
        }
    }

    @GetMapping("/admins/count")
    public ResponseEntity<Long> contarAdministradores() {
        try {
            long total = usuarioAdminRepository.count();
            return ResponseEntity.ok(total);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(0L);
        }
    }
}

class LoginFormRequest {
    private String correo;
    private String password;

    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
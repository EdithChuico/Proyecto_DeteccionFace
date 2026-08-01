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
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import jakarta.mail.internet.MimeMessage;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.code.CodeVerifier;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.qr.QrGenerator;
import dev.samstevens.totp.qr.ZxingPngQrGenerator;
import dev.samstevens.totp.util.Utils;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

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
    @Autowired
    private JavaMailSender mailSender;
    @Value("${spring.mail.username}")
    private String correoRemitente;
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
                String email = idToken.getPayload().getEmail();
                Optional<UsuarioAdmin> adminOpt = usuarioAdminRepository.findByCorreo(email);
                if (adminOpt.isEmpty()) {
                    return ResponseEntity.status(403).body("Acceso denegado: El correo no pertenece a un administrador registrado.");
                }
                UsuarioAdmin admin = adminOpt.get();
                String tokenGenerado = jwtUtil.generarToken(admin.getCorreo());
                Map<String, Object> respuesta = new HashMap<>();
                respuesta.put("autenticado", true);
                respuesta.put("token", tokenGenerado);
                respuesta.put("nombre", admin.getNombre());
                return ResponseEntity.ok(respuesta);
            } else {
                return ResponseEntity.status(401).body("Token de Google inválido.");
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error interno durante la verificación.");
        }
    }
    @PostMapping("/login")
    public ResponseEntity<?> autenticarConPassword(@RequestBody Map<String, String> request) {
        String correoLimpio = request.get("correo").trim().toLowerCase();
        String password = request.get("password");

        Optional<UsuarioAdmin> adminOpt = usuarioAdminRepository.findByCorreo(correoLimpio);
        if (adminOpt.isEmpty() || !adminOpt.get().getPassword().equals(password)) {
            return ResponseEntity.status(401).body("Credenciales incorrectas.");
        }
        UsuarioAdmin admin = adminOpt.get();
        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("requiereMfa", true);
        respuesta.put("correo", admin.getCorreo());
        respuesta.put("mfaConfigurado", admin.isMfaHabilitado());

        return ResponseEntity.ok(respuesta);
    }
    @PostMapping("/generar-qr")
    public ResponseEntity<?> generarQrMfa(@RequestBody Map<String, String> request) {
        try {
            String correo = request.get("correo");
            UsuarioAdmin admin = usuarioAdminRepository.findByCorreo(correo).orElseThrow();
            SecretGenerator secretGenerator = new DefaultSecretGenerator();
            String secret = secretGenerator.generate();

            admin.setMfaSecret(secret);
            usuarioAdminRepository.save(admin);
            QrData data = new QrData.Builder()
                    .label(correo)
                    .secret(secret)
                    .issuer("Smart Assistance Admin")
                    .digits(6)
                    .period(30)
                    .build();
            QrGenerator generator = new ZxingPngQrGenerator();
            byte[] imageData = generator.generate(data);
            String mimeType = generator.getImageMimeType();
            String qrBase64 = Utils.getDataUriForImage(imageData, mimeType);
            Map<String, String> respuesta = new HashMap<>();
            respuesta.put("qrImage", qrBase64);
            respuesta.put("secretoManual", secret);
            return ResponseEntity.ok(respuesta);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error generando el código QR.");
        }
    }
    // ==========================================
    // 4. VERIFICAR CÓDIGO (De App Authenticator o Correo) Y ENTREGAR JWT FINAL
    // ==========================================
    @PostMapping("/verificar-codigo")
    public ResponseEntity<?> verificarCodigoMfa(@RequestBody Map<String, String> request) {
        String correo = request.get("correo");
        String codigoIngresado = request.get("codigo").trim();

        UsuarioAdmin admin = usuarioAdminRepository.findByCorreo(correo).orElseThrow();

        boolean esValido = false;
        boolean activandoTotp = false;

        // 1. Validar si es el código del correo
        if (admin.getOtpTemporal() != null && codigoIngresado.equals(admin.getOtpTemporal())) {
            esValido = true;
            admin.setOtpTemporal(null); // Limpiamos tras usarlo
        }
        // 2. Validar si es el código de la App (TOTP)
        else if (admin.getMfaSecret() != null) {
            CodeVerifier verifier = new DefaultCodeVerifier(new DefaultCodeGenerator(), new SystemTimeProvider());
            if (verifier.isValidCode(admin.getMfaSecret(), codigoIngresado)) {
                esValido = true;
                if (!admin.isMfaHabilitado()) {
                    activandoTotp = true; // Es la primera vez que escanea el QR
                }
            }
        }

        if (esValido) {
            // Solo si validó el QR por primera vez, lo marcamos como configurado
            if (activandoTotp) {
                admin.setMfaHabilitado(true);
            }
            usuarioAdminRepository.save(admin);

            String tokenGenerado = jwtUtil.generarToken(admin.getCorreo());
            Map<String, Object> respuestaSesion = new HashMap<>();
            respuestaSesion.put("autenticado", true);
            respuestaSesion.put("token", tokenGenerado);
            respuestaSesion.put("nombre", admin.getNombre());
            return ResponseEntity.ok(respuestaSesion);
        } else {
            return ResponseEntity.status(401).body("Código de seguridad inválido o expirado.");
        }
    }

    // ==========================================
    // 5. ENVIAR CÓDIGO OTP POR CORREO (Diseño HTML Corporativo)
    // ==========================================
    @PostMapping("/enviar-otp")
    public ResponseEntity<?> enviarOtpPorCorreo(@RequestBody Map<String, String> request) {
        try {
            String correo = request.get("correo");
            UsuarioAdmin admin = usuarioAdminRepository.findByCorreo(correo).orElseThrow();

            // Generar 6 dígitos al azar
            String codigoOtp = String.format("%06d", new Random().nextInt(999999));
            admin.setOtpTemporal(codigoOtp);
            usuarioAdminRepository.save(admin);

            // Diseño HTML Elegante y Corporativo
            String htmlCorreo = "<!DOCTYPE html>" +
                    "<html lang='es'>" +
                    "<head><meta charset='UTF-8'></head>" +
                    "<body style='margin: 0; padding: 0; background-color: #f4f6f9; font-family: Arial, sans-serif;'>" +
                    "  <table role='presentation' width='100%' cellspacing='0' cellpadding='0' border='0' style='padding: 30px 0;'>" +
                    "    <tr>" +
                    "      <td align='center'>" +
                    "        <table role='presentation' width='500' cellspacing='0' cellpadding='0' border='0' style='background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);'>" +
                    "          <!-- Encabezado con Logo -->" +
                    "          <tr>" +
                    "            <td style='background-color: #003366; padding: 30px; text-align: center;'>" +
                    "              <img src='cid:logoAuth' alt='Smart Assistance' width='140' style='display: block; margin: 0 auto 15px auto;' />" +
                    "              <h2 style='color: #ffffff; margin: 0; font-size: 22px; font-weight: normal; letter-spacing: 1px;'>Verificación de Seguridad</h2>" +
                    "            </td>" +
                    "          </tr>" +
                    "          <!-- Cuerpo del Correo -->" +
                    "          <tr>" +
                    "            <td style='padding: 40px 30px; text-align: center;'>" +
                    "              <p style='color: #475569; font-size: 16px; margin-top: 0;'>Hola <strong>" + admin.getNombre() + "</strong>,</p>" +
                    "              <p style='color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 30px;'>" +
                    "                Se ha solicitado un inicio de sesión en tu cuenta administrativa. Utiliza el siguiente código para completar el proceso:" +
                    "              </p>" +
                    "              <!-- Caja del Código -->" +
                    "              <div style='background-color: #eff6ff; border: 2px dashed #003366; border-radius: 8px; padding: 20px; display: inline-block;'>" +
                    "                <span style='font-size: 34px; font-weight: bold; color: #003366; letter-spacing: 10px;'>" + codigoOtp + "</span>" +
                    "              </div>" +
                    "              <p style='color: #ef4444; font-size: 13px; margin-top: 30px; line-height: 1.5; font-weight: bold;'>" +
                    "                Por tu seguridad, nunca compartas este código con nadie." +
                    "              </p>" +
                    "            </td>" +
                    "          </tr>" +
                    "          <!-- Pie de página -->" +
                    "          <tr>" +
                    "            <td style='background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;'>" +
                    "              <p style='color: #94a3b8; font-size: 12px; margin: 0;'>" +
                    "                © 2026 Smart Assistance. Todos los derechos reservados.<br>" +
                    "                Si no solicitaste este acceso, por favor ignora este mensaje." +
                    "              </p>" +
                    "            </td>" +
                    "          </tr>" +
                    "        </table>" +
                    "      </td>" +
                    "    </tr>" +
                    "  </table>" +
                    "</body>" +
                    "</html>";

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            // Aquí enmascaramos el correo para que llegue como "Smart Assistance"
            helper.setFrom(correoRemitente, "Smart Assistance");
            helper.setTo(admin.getCorreo());
            helper.setSubject("Código de Acceso OTP - Smart Assistance");
            helper.setText(htmlCorreo, true);

            // Adjuntar el logo inline para que se renderice en el HTML
            org.springframework.core.io.ClassPathResource logoImagen = new org.springframework.core.io.ClassPathResource("static/Logo_Factura.jpg");
            helper.addInline("logoAuth", logoImagen);

            mailSender.send(message);

            return ResponseEntity.ok("Código enviado exitosamente al correo.");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error al enviar el correo.");
        }
    }
    // ==========================================
    // 6. SOLICITAR RECUPERACIÓN (Genera Token y envía enlace)
    // ==========================================
    @PostMapping("/olvide-password")
    public ResponseEntity<?> solicitarRecuperacion(@RequestBody Map<String, String> request) {
        String correo = request.get("correo");
        Optional<UsuarioAdmin> adminOpt = usuarioAdminRepository.findByCorreo(correo);

        if (adminOpt.isEmpty()) {
            // Retornamos OK incluso si no existe por seguridad (evita enumeración de usuarios)
            return ResponseEntity.ok("Si el correo existe, se enviará un enlace de recuperación.");
        }

        UsuarioAdmin admin = adminOpt.get();

        // 1. Generar token criptográfico único (UUID) y expiración (15 mins)
        String token = java.util.UUID.randomUUID().toString();
        admin.setResetToken(token);
        admin.setResetTokenExpiration(java.time.LocalDateTime.now().plusMinutes(15));
        usuarioAdminRepository.save(admin);

        // 2. Encolar tarea asíncrona para enviar el correo (El Worker)
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                String enlace = "http://localhost:3000/restablecer-password?token=" + token + "&correo=" + correo;

                String htmlCorreo = "<div style='font-family: Arial; padding: 20px; text-align: center; background-color: #f4f6f9;'>" +
                        "<h2 style='color: #003366;'>Recuperación de Cuenta</h2>" +
                        "<p>Has solicitado restablecer tu contraseña en <b>Smart Assistance</b>.</p>" +
                        "<p>Haz clic en el siguiente botón para crear una nueva contraseña. Este enlace expira en 15 minutos.</p>" +
                        "<a href='" + enlace + "' style='display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 15px;'>Restablecer Contraseña</a>" +
                        "<p style='color: #64748b; font-size: 12px; margin-top: 20px;'>Si no solicitaste este cambio, ignora este mensaje.</p>" +
                        "</div>";

                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(correoRemitente, "Smart Assistance Seguridad");
                helper.setTo(admin.getCorreo());
                helper.setSubject("Restablecer Contraseña - Smart Assistance");
                helper.setText(htmlCorreo, true);

                mailSender.send(message);
            } catch (Exception e) {
                logger.error("Error enviando correo de recuperación: " + e.getMessage());
            }
        });

        return ResponseEntity.ok("Si el correo existe, se enviará un enlace de recuperación.");
    }

    // ==========================================
    // 7. PROCESAR RESTABLECIMIENTO (Valida Token y cambia password)
    // ==========================================
    @PostMapping("/restablecer-password")
    public ResponseEntity<?> procesarRestablecimiento(@RequestBody Map<String, String> request) {
        String correo = request.get("correo");
        String token = request.get("token");
        String nuevaPassword = request.get("nuevaPassword");

        Optional<UsuarioAdmin> adminOpt = usuarioAdminRepository.findByCorreo(correo);

        if (adminOpt.isEmpty()) {
            return ResponseEntity.status(400).body("Solicitud inválida.");
        }

        UsuarioAdmin admin = adminOpt.get();

        // Validar que el token coincida y no esté vacío
        if (admin.getResetToken() == null || !admin.getResetToken().equals(token)) {
            return ResponseEntity.status(400).body("El enlace de recuperación es inválido o ha sido alterado.");
        }

        // Validar expiración (15 minutos)
        if (admin.getResetTokenExpiration().isBefore(java.time.LocalDateTime.now())) {
            return ResponseEntity.status(400).body("El enlace de recuperación ha expirado. Por favor, solicita uno nuevo.");
        }

        // Actualizar contraseña y limpiar tokens
        admin.setPassword(nuevaPassword);
        admin.setResetToken(null);
        admin.setResetTokenExpiration(null);
        usuarioAdminRepository.save(admin);

        return ResponseEntity.ok("Contraseña actualizada exitosamente.");
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
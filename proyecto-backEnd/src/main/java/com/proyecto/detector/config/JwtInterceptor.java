package com.proyecto.detector.config;

import com.proyecto.detector.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class JwtInterceptor implements HandlerInterceptor {

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // 1. Dejar pasar peticiones OPTIONS
        if (request.getMethod().equalsIgnoreCase("OPTIONS")) {
            return true;
        }

        // 2. Extraer el token de la cabecera
        String authHeader = request.getHeader("Authorization");
        if (request.getRequestURI().contains("/api/configuracion") && request.getMethod().equalsIgnoreCase("GET")) {
            return true;
        }
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED); // 401
            return false;
        }

        String token = authHeader.substring(7);

        try {
            // 3. Validar si sigue vivo o si fue alterado
            jwtUtil.validarToken(token);
            return true;
        } catch (Exception e) {
            System.out.println("Token expirado o inválido rechazado por el servidor.");
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED); // 401
            return false; // Bloquea el paso
        }
    }
}
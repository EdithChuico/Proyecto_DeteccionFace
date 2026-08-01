package com.proyecto.detector.config;

import com.proyecto.detector.config.JwtInterceptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Autowired
    private JwtInterceptor jwtInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(jwtInterceptor)
                // 1. Aplicamos el guardia a todas las rutas de la API
                .addPathPatterns("/api/empleados/**", "/api/asistencias/**", "/api/auth/admins/count", "/api/configuracion/**")

                .excludePathPatterns(
                        "/api/auth/login",          // Login tradicional libre
                        "/api/auth/google",         // Login de Google libre

                        "/api/asistencias/marcar",  // Permite que el empleado registre asistencia sin JWT
                        "/api/empleados/buscar/**", // Por si tu vista de empleado busca el nombre por cédula
                        "/api/asistencias/todas",
                        "/api/asistencias/deuda/**",
                        "/api/asistencias/pagar/**"
                );
    }
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns("*") // Permite que el puerto 3000 pase
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS") // OPTIONS es vital para el preflight
                .allowedHeaders("*")
                .allowCredentials(false);
    }
}
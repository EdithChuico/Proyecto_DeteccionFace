package com.proyecto.detector.config;

import com.proyecto.detector.security.StatsWebSocketHandler;
import com.proyecto.detector.security.GeoWebSocketHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Autowired
    private StatsWebSocketHandler statsWebSocketHandler;

    @Autowired
    private GeoWebSocketHandler geoWebSocketHandler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(statsWebSocketHandler, "/ws/stats").setAllowedOrigins("*");
        // Nueva ruta para que los empleados escuchen cambios de ubicación
        registry.addHandler(geoWebSocketHandler, "/ws/geo").setAllowedOrigins("*");
    }
}
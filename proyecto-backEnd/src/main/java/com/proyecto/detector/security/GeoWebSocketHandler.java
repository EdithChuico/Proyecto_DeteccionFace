package com.proyecto.detector.security;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class GeoWebSocketHandler extends TextWebSocketHandler {

    private final List<WebSocketSession> sesionesEmpleados = new CopyOnWriteArrayList<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sesionesEmpleados.add(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        sesionesEmpleados.remove(session);
    }

    public void notificarCambioGeocerca() {
        for (WebSocketSession sesion : sesionesEmpleados) {
            if (sesion.isOpen()) {
                try {
                    sesion.sendMessage(new TextMessage("REFRESH_GEO"));
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }
    }
}
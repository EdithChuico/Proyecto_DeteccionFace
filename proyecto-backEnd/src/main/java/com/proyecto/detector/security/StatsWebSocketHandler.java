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
public class StatsWebSocketHandler extends TextWebSocketHandler {
    private final List<WebSocketSession> sesionesActivas = new CopyOnWriteArrayList<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sesionesActivas.add(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        sesionesActivas.remove(session);
    }
    public void notificarActualizacion() {
        for (WebSocketSession sesion : sesionesActivas) {
            if (sesion.isOpen()) {
                try {
                    sesion.sendMessage(new TextMessage("REFRESH_STATS"));
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }
    }
}
package com.proyecto.detector.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class AsistenciaService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate; // Para enviar WebSockets

    @Async("iaTaskExecutor")
    public void procesarAsistenciaFacial(String empleadoId, String fotoBase64) {
        try {
            System.out.println("Procesando rostro en el hilo: " + Thread.currentThread().getName());
            Thread.sleep(3000);

            boolean llegoTarde = true; // Simulación
            double multa = 5.00;

            if (llegoTarde) {
                String mensajeAlerta = "El empleado " + empleadoId + " registró asistencia con retraso. Multa: $" + multa;
                messagingTemplate.convertAndSend("/topic/alertas", mensajeAlerta);
            }

        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
}

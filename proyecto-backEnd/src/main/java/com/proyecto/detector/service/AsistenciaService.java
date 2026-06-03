package com.proyecto.detector.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class AsistenciaService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate; // Para enviar WebSockets

    // Este método corre en un hilo separado gracias a @Async
    @Async("iaTaskExecutor")
    public void procesarAsistenciaFacial(String empleadoId, String fotoBase64) {
        try {
            // 1. Simulamos el tiempo que tarda la IA en procesar el rostro
            System.out.println("Procesando rostro en el hilo: " + Thread.currentThread().getName());
            Thread.sleep(3000);

            // 2. Lógica de negocio (Ej: Validar hora y calcular multa)
            boolean llegoTarde = true; // Simulación
            double multa = 5.00;

            // 3. Guardar en Base de Datos (Aquí iría tu repository.save())
            // 4. Emitir evento en tiempo real al Dashboard del Administrador
            if (llegoTarde) {
                String mensajeAlerta = "El empleado " + empleadoId + " registró asistencia con retraso. Multa: $" + multa;
                messagingTemplate.convertAndSend("/topic/alertas", mensajeAlerta);
            }

        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
}

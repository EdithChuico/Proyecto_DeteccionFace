package com.proyecto.detector.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "asistencias")
@Data
public class Asistencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String empleadoId;
    private LocalDateTime fechaHora;
    private String estado; // "A Tiempo" o "Atraso"
    private double multa;
}
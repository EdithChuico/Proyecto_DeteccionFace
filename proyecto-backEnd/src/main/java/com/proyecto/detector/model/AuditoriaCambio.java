package com.proyecto.detector.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "auditoria_cambios")
@Data
@NoArgsConstructor
public class AuditoriaCambio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String accion;

    @Column(nullable = false)
    private String realizadoPor;

    @Column(nullable = false)
    private LocalDateTime fechaHora;
    public AuditoriaCambio(String accion, String realizadoPor, LocalDateTime fechaHora) {
        this.accion = accion;
        this.realizadoPor = realizadoPor;
        this.fechaHora = fechaHora;
    }
}
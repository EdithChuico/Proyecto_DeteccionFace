package com.proyecto.detector.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "empleados")
@Data
public class Empleado {

    @Id
    private String id;
    private String nombre;
    private String rutaDataset;
    private String estado = "Activo";
}
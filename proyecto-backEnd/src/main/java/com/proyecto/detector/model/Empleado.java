package com.proyecto.detector.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "empleados")
@Data // Si usas Lombok, si no, genera Getters y Setters manualmente
public class Empleado {

    @Id
    private String id; // Ejemplo: "EMP-1042" o la cédula

    private String nombre;

    private String rutaDataset; // Guardará dónde están sus 30 fotos (ej: "dataset/EMP-1042")
}
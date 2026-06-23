package com.proyecto.detector.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "configuracion_geo")
@Data
public class ConfiguracionGeo {

    @Id
    private String id = "MAIN_CONFIG"; // Usamos un ID fijo porque solo existirá un registro de configuración

    private double latitud;
    private double longitud;
    private int radioMetros;
}
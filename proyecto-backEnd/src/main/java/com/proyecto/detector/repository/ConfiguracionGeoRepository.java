package com.proyecto.detector.repository;

import com.proyecto.detector.model.ConfiguracionGeo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConfiguracionGeoRepository extends JpaRepository<ConfiguracionGeo, String> {
}
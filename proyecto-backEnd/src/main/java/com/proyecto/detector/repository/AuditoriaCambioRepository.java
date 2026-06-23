package com.proyecto.detector.repository;

import com.proyecto.detector.model.AuditoriaCambio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditoriaCambioRepository extends JpaRepository<AuditoriaCambio, Long> {
}
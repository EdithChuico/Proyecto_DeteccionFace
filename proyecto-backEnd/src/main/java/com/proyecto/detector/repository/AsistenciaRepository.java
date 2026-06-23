package com.proyecto.detector.repository;

import com.proyecto.detector.model.Asistencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;

@Repository
public interface AsistenciaRepository extends JpaRepository<Asistencia, Long> {
    boolean existsByEmpleadoIdAndFechaHoraBetween(String empleadoId, LocalDateTime inicio, LocalDateTime fin);
}
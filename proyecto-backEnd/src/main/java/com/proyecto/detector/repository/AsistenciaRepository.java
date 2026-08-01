package com.proyecto.detector.repository;

import com.proyecto.detector.model.Asistencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AsistenciaRepository extends JpaRepository<Asistencia, Long> {
    boolean existsByEmpleadoIdAndTipoMarcacionAndFechaHoraBetween(String empleadoId, String tipoMarcacion, LocalDateTime inicio, LocalDateTime fin);
    List<Asistencia> findByEmpleadoIdAndFechaHoraBetween(String empleadoId, LocalDateTime inicio, LocalDateTime fin);
    List<Asistencia> findByEmpleadoId(String empleadoId);
    Optional<Asistencia> findFirstByEmpleadoIdAndTipoMarcacionAndFechaHoraBetweenOrderByFechaHoraDesc(String empleadoId, String tipoMarcacion, LocalDateTime inicio, LocalDateTime fin);

    @Query("SELECT COALESCE(SUM(a.multa), 0) FROM Asistencia a WHERE a.empleadoId = :empleadoId")
    Double sumarMultasPorEmpleado(@Param("empleadoId") String empleadoId);

    @Transactional
    @Modifying
    @Query("UPDATE Asistencia a SET a.multa = 0 WHERE a.empleadoId = :empleadoId AND a.multa > 0")
    int liquidarMultasPorEmpleado(@Param("empleadoId") String empleadoId);
}
package com.supportsystem.majorproject.repository;

import com.supportsystem.majorproject.model.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

  List<Appointment> findByDoctorId(Long doctorId);
  List<Appointment> findByPatientNameIgnoreCase(String patientName);
  List<Appointment> findByPatientName(String patientName);

  @Query("SELECT a FROM Appointment a WHERE a.doctorId = :doctorId " +
         "AND a.appointmentTime >= :startOfDay AND a.appointmentTime < :endOfDay")
  List<Appointment> findByDoctorIdAndDate(
      @Param("doctorId") Long doctorId,
      @Param("startOfDay") LocalDateTime startOfDay,
      @Param("endOfDay") LocalDateTime endOfDay);
}

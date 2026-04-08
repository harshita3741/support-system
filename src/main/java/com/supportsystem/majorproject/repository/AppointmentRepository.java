package com.supportsystem.majorproject.repository;

import com.supportsystem.majorproject.model.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

  List<Appointment> findByDoctorId(Long doctorId);
}

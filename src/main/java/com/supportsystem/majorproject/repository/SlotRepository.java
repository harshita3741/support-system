package com.supportsystem.majorproject.repository;

import com.supportsystem.majorproject.model.AppointmentSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SlotRepository extends JpaRepository<AppointmentSlot, Long> {
  List<AppointmentSlot> findByDoctorIdAndBookedFalse(Long doctorId);
  List<AppointmentSlot> findByDoctorId(Long doctorId);
}

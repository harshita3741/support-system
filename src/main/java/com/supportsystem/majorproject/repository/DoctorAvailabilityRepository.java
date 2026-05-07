package com.supportsystem.majorproject.repository;

import com.supportsystem.majorproject.model.DoctorAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface DoctorAvailabilityRepository extends JpaRepository<DoctorAvailability, Long> {

  /** Return all doctors whose status is AVAILABLE */
  @Query("SELECT da FROM DoctorAvailability da WHERE da.status = 'AVAILABLE'")
  List<DoctorAvailability> findAllAvailable();
}

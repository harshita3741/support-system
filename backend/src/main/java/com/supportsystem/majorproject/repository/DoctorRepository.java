package com.supportsystem.majorproject.repository;

import com.supportsystem.majorproject.model.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {

  List<Doctor> findBySpecialtyIgnoreCaseAndAvailableTrue(String specialty);
}

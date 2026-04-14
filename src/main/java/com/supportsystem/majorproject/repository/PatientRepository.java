package com.supportsystem.majorproject.repository;

import com.supportsystem.majorproject.model.Patient;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PatientRepository extends JpaRepository<Patient, String> {}

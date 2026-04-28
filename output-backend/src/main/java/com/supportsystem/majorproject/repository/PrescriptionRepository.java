package com.supportsystem.majorproject.repository;

import com.supportsystem.majorproject.model.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {
  List<Prescription> findByPatientNameIgnoreCase(String patientName);
  List<Prescription> findByCaseId(Long caseId);
}

package com.supportsystem.majorproject.repository;

import com.supportsystem.majorproject.model.MedicalCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicalCaseRepository extends JpaRepository<MedicalCase, Long> {

  List<MedicalCase> findByAssignedDoctorId(Long doctorId);

  List<MedicalCase> findByStatus(String status);  // ← new
}

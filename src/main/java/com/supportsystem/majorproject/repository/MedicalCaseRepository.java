package com.supportsystem.majorproject.repository;

import com.supportsystem.majorproject.model.MedicalCase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MedicalCaseRepository extends JpaRepository<MedicalCase, Long> {

    List<MedicalCase> findByAssignedDoctorId(Long doctorId);
}
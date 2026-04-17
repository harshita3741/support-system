package com.supportsystem.majorproject.service;

import com.supportsystem.majorproject.model.MedicalCase;
import com.supportsystem.majorproject.queue.DepartmentQueue;
import com.supportsystem.majorproject.repository.MedicalCaseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MedicalCaseService {

  @Autowired
  private DepartmentQueue departmentQueue;

  @Autowired
  private MedicalCaseRepository repository;

  public List<MedicalCase> getCasesByDoctor(Long doctorId) {
    return repository.findByAssignedDoctorId(doctorId);
  }

  public void createCase(MedicalCase medicalCase) {
    medicalCase.setStatus("OPEN");
    departmentQueue.addCase(medicalCase);
    repository.save(medicalCase);  // ← persists to DB so queue endpoint can fetch it
    System.out.println("Medical case added to queue: " + medicalCase.getCaseId());
  }

  public List<MedicalCase> getQueueCases() {
    return repository.findByStatus("OPEN");
  }

  public MedicalCase findById(Long caseId) {
    return repository.findById(caseId).orElse(null);
  }

  public String acceptCase(Long caseId, String doctorId) {
    MedicalCase mc = repository.findById(caseId).orElse(null);
    if (mc != null) {
      mc.setStatus("ACCEPTED");
      if (doctorId != null && !doctorId.isEmpty()) {
        mc.setAssignedDoctorId(Long.parseLong(doctorId));
      }
      repository.save(mc);
      return "Accepted";
    }
    return "Case not found";
  }

  public String declineCase(Long caseId) {
    MedicalCase mc = repository.findById(caseId).orElse(null);
    if (mc != null) {
      mc.setStatus("DECLINED");
      repository.save(mc);
      return "Declined";
    }
    return "Case not found";
  }
}


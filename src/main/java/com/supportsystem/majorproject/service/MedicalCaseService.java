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
    repository.save(medicalCase);
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

  public String updateStatus(Long caseId, String status) {
    MedicalCase mc = repository.findById(caseId).orElse(null);
    if (mc != null) {
      mc.setStatus(status);
      repository.save(mc);
      return status;
    }
    return "Case not found";
  }

  public String upgradeToVideo(Long caseId) {
    MedicalCase mc = repository.findById(caseId).orElse(null);
    if (mc != null) {
      mc.setConsultationType("VIDEO");
      repository.save(mc);
      return "Upgraded to VIDEO";
    }
    return "Case not found";
  }
}

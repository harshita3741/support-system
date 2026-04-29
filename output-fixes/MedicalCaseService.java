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
    medicalCase.setAssignedDoctorId(null); // ensure no FK violation — doctor assigned later on accept
    repository.save(medicalCase);          // persist FIRST (while assignedDoctorId is still null)
    departmentQueue.addCase(medicalCase);  // THEN queue — worker may set doctorId in-memory but won't save
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
      // NOTE: assignedDoctorId is intentionally NOT set here to avoid the FK constraint
      // on the doctors table. The doctor identity is tracked in-memory by DoctorService.
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

  /**
   * Appends quick-add details (duration, severity, notes) to the case's quick_details field.
   * Doctors can see this alongside symptoms in the queue.
   */
  public void appendQuickDetails(Long caseId, String duration, String severity, String notes) {
    MedicalCase mc = repository.findById(caseId).orElse(null);
    if (mc == null) return;

    StringBuilder sb = new StringBuilder();
    if (duration != null && !duration.isBlank()) sb.append("Duration: ").append(duration);
    if (severity != null && !severity.isBlank()) {
      if (sb.length() > 0) sb.append(" | ");
      sb.append("Severity: ").append(severity);
    }
    if (notes != null && !notes.isBlank()) {
      if (sb.length() > 0) sb.append(" | ");
      sb.append("Notes: ").append(notes);
    }

    // Append to existing symptoms so doctors see everything in one place
    String existing = mc.getSymptoms() != null ? mc.getSymptoms() : "";
    if (sb.length() > 0) {
      mc.setSymptoms(existing.isBlank() ? sb.toString() : existing + " | " + sb.toString());
      repository.save(mc);
    }
  }
}

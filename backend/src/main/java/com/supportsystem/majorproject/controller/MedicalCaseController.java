package com.supportsystem.majorproject.controller;

import com.supportsystem.majorproject.model.MedicalCase;
import com.supportsystem.majorproject.service.MedicalCaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/cases")
@CrossOrigin(origins = "*")
public class MedicalCaseController {

  @Autowired
  private MedicalCaseService medicalCaseService;

  @PostMapping("/create-batch")
  public String createCases(@RequestBody List<MedicalCase> cases) {
    for (MedicalCase mc : cases) {
      medicalCaseService.createCase(mc);
    }
    return "Multiple cases created";
  }

  @GetMapping("/doctor/{doctorId}")
  public List<MedicalCase> getDoctorCases(@PathVariable Long doctorId) {
    return medicalCaseService.getCasesByDoctor(doctorId);
  }

  @GetMapping("/queue")
  public List<MedicalCase> getQueueCases() {
    return medicalCaseService.getQueueCases();
  }

  @GetMapping("/{caseId}/status")
  public ResponseEntity<Map<String, String>> getCaseStatus(@PathVariable Long caseId) {
    MedicalCase mc = medicalCaseService.findById(caseId);
    if (mc == null) return ResponseEntity.notFound().build();
    return ResponseEntity.ok(Map.of("status", mc.getStatus(), "caseId", String.valueOf(caseId)));
  }

  @GetMapping("/{caseId}")
  public ResponseEntity<MedicalCase> getCase(@PathVariable Long caseId) {
    MedicalCase mc = medicalCaseService.findById(caseId);
    if (mc == null) return ResponseEntity.notFound().build();
    return ResponseEntity.ok(mc);
  }

  @PatchMapping("/{caseId}/accept")
  public String acceptCase(@PathVariable Long caseId, @RequestBody Map<String, String> body) {
    return medicalCaseService.acceptCase(caseId, body.get("doctorId"));
  }

  @PatchMapping("/{caseId}/decline")
  public ResponseEntity<Map<String, String>> declineCase(@PathVariable Long caseId) {
    medicalCaseService.declineCase(caseId);
    return ResponseEntity.ok(Map.of("status", "declined"));
  }
}


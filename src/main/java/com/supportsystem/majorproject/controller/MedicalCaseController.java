package com.supportsystem.majorproject.controller;

import com.supportsystem.majorproject.model.MedicalCase;
import com.supportsystem.majorproject.service.MedicalCaseService;
import org.springframework.beans.factory.annotation.Autowired;
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

  @PatchMapping("/{caseId}/accept")
  public String acceptCase(@PathVariable Long caseId, @RequestBody Map<String, String> body) {
    return medicalCaseService.acceptCase(caseId, body.get("doctorId"));
  }
}

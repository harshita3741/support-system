package com.supportsystem.majorproject.controller;

import com.supportsystem.majorproject.model.Patient;
import com.supportsystem.majorproject.service.PatientService;
import org.springframework.web.bind.annotation.*;
import com.supportsystem.majorproject.model.dto.LoginRequest;

@RestController
@RequestMapping("/patients")
@CrossOrigin(origins = "*")
public class PatientController {

  private final PatientService patientService;

  public PatientController(PatientService patientService) {
    this.patientService = patientService;
  }

  @PostMapping("/register")
  public Patient register(@RequestBody Patient patient) {
    return patientService.register(patient);
  }

  @PostMapping("/login")
  public Patient login(@RequestBody LoginRequest request) {
    return patientService.login(request.getPatientId(), request.getPassword());
  }
}

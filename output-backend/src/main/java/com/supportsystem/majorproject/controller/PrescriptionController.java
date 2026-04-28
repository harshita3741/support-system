package com.supportsystem.majorproject.controller;

import com.supportsystem.majorproject.model.Prescription;
import com.supportsystem.majorproject.repository.PrescriptionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/prescriptions")
@CrossOrigin(origins = "*")
public class PrescriptionController {

  @Autowired
  private PrescriptionRepository repository;

  @PostMapping
  public Prescription create(@RequestBody Prescription prescription) {
    return repository.save(prescription);
  }

  @GetMapping("/patient/{patientName}")
  public List<Prescription> getByPatient(@PathVariable String patientName) {
    return repository.findByPatientNameIgnoreCase(patientName);
  }

  @GetMapping("/case/{caseId}")
  public List<Prescription> getByCase(@PathVariable Long caseId) {
    return repository.findByCaseId(caseId);
  }
}

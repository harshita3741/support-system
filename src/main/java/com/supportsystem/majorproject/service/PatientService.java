package com.supportsystem.majorproject.service;

import com.supportsystem.majorproject.model.Patient;
import com.supportsystem.majorproject.repository.PatientRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;

@Service
public class PatientService {

  private final PatientRepository repository;

  public PatientService(PatientRepository repository) {
    this.repository = repository;
  }

  public Patient register(Patient patient) {
    // Auto generate Patient ID
    String id = "PAT-" + LocalDate.now().getYear() + "-" +
      String.format("%06d", (int)(Math.random() * 999999));
    patient.setPatientId(id);
    patient.setRegistrationDate(LocalDate.now().toString());

    // Auto calculate BMI
    if (patient.getHeight() != null && patient.getWeight() != null) {
      double heightM = patient.getHeight() / 100;
      double bmi = patient.getWeight() / (heightM * heightM);
      patient.setBmi(Math.round(bmi * 10.0) / 10.0);
    }
    return repository.save(patient);
  }

  public Patient login(String patientId, String password) {
    Patient patient = repository.findById(patientId)
      .orElseThrow(() -> new RuntimeException("Patient not found"));
    if (!patient.getPassword().equals(password)) {
      throw new RuntimeException("Invalid password");
    }
    return patient;
  }
}

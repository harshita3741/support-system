package com.supportsystem.majorproject.service;

import com.supportsystem.majorproject.model.Patient;
import com.supportsystem.majorproject.repository.PatientRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.util.List;

@Service
public class PatientService {

  private final PatientRepository repository;

  public PatientService(PatientRepository repository) {
    this.repository = repository;
  }

  public Patient register(Patient patient) {
    String id = "PAT-" + LocalDate.now().getYear() + "-" +
      String.format("%06d", (int)(Math.random() * 999999));
    patient.setPatientId(id);
    patient.setRegistrationDate(LocalDate.now().toString());
    if (patient.getHeight() != null && patient.getWeight() != null) {
      double h = patient.getHeight() / 100;
      double bmi = patient.getWeight() / (h * h);
      patient.setBmi(Math.round(bmi * 10.0) / 10.0);
    }
    return repository.save(patient);
  }

  public Patient login(String patientId, String password) {
    Patient patient = repository.findById(patientId)
      .orElseThrow(() -> new ResponseStatusException(
        HttpStatus.UNAUTHORIZED, "Invalid Patient ID or password"));
    if (!patient.getPassword().equals(password))
      throw new ResponseStatusException(
        HttpStatus.UNAUTHORIZED, "Invalid Patient ID or password");
    return patient;
  }

  public List<Patient> getAllPatients() {
    return repository.findAll();
  }

  public Patient getPatientById(String patientId) {
    return repository.findById(patientId)
      .orElseThrow(() -> new RuntimeException("Patient not found"));
  }
}

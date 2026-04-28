package com.supportsystem.majorproject.controller;

import com.supportsystem.majorproject.model.Appointment;
import com.supportsystem.majorproject.model.Prescription;
import com.supportsystem.majorproject.repository.PrescriptionRepository;
import com.supportsystem.majorproject.service.AppointmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/prescriptions")
@CrossOrigin(origins = "*")
public class PrescriptionController {

  @Autowired
  private PrescriptionRepository repository;

  @Autowired
  private AppointmentService appointmentService;

  @PostMapping
  public Prescription create(@RequestBody Prescription prescription) {
    Prescription saved = repository.save(prescription);

    // Auto-book follow-up appointment if followUpDate + time provided
    // Format expected: followUpDate = "YYYY-MM-DD", followUpTime = "HH:MM" (in symptoms field hack)
    // We encode the time inside followUpDate as "YYYY-MM-DDTHH:MM" when both are set
    if (prescription.getFollowUpDate() != null && prescription.getFollowUpDate().contains("T")) {
      try {
        bookFollowUpAppointment(prescription);
      } catch (Exception ignored) {}
    }

    return saved;
  }

  private void bookFollowUpAppointment(Prescription rx) {
    String dateTimeStr = rx.getFollowUpDate(); // "YYYY-MM-DDTHH:MM"
    LocalDateTime followUpTime;
    try {
      followUpTime = LocalDateTime.parse(dateTimeStr + ":00",
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"));
    } catch (Exception e) {
      return;
    }

    Appointment appt = new Appointment();
    appt.setPatientName(rx.getPatientName());
    appt.setDoctorId(rx.getDoctorId());
    appt.setDoctorName(rx.getDoctorName());
    appt.setDepartment(rx.getDepartment());
    appt.setReason("Follow-up: " + (rx.getDiagnosis() != null ? rx.getDiagnosis() : "Consultation"));
    appt.setAppointmentTime(followUpTime);
    appt.setStatus("BOOKED");
    appointmentService.bookAppointment(appt);
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

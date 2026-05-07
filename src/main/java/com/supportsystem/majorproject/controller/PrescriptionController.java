package com.supportsystem.majorproject.controller;

import com.supportsystem.majorproject.model.Appointment;
import com.supportsystem.majorproject.model.Prescription;
import com.supportsystem.majorproject.repository.PrescriptionRepository;
import com.supportsystem.majorproject.service.AppointmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Prescription controller — updated to auto-create follow-up appointments
 * when the doctor selects a follow-up date AND time slot.
 *
 * Protocol:
 *   The doctor dashboard sends followUpDate as "YYYY-MM-DDTHH:MM" (e.g. "2025-12-20T09:00")
 *   when both a date and a time slot are selected.
 *   If only a date is selected, followUpDate is "YYYY-MM-DD" (no auto-booking — just notes).
 */
@RestController
@RequestMapping("/prescriptions")
@CrossOrigin(origins = "*")
public class PrescriptionController {

  @Autowired
  private PrescriptionRepository repository;

  @Autowired
  private AppointmentService appointmentService;

  @PostMapping
  public ResponseEntity<Map<String, Object>> create(@RequestBody Prescription prescription) {
    Prescription saved = repository.save(prescription);

    Map<String, Object> response = new HashMap<>();
    response.put("prescription", saved);
    response.put("followUpAppointment", null);

    // Auto-book follow-up appointment when doctor provides date + time slot
    if (prescription.getFollowUpDate() != null && prescription.getFollowUpDate().contains("T")) {
      try {
        Appointment followUp = bookFollowUpAppointment(prescription);
        if (followUp != null) {
          response.put("followUpAppointment", Map.of(
            "id",              followUp.getId() != null ? followUp.getId() : 0,
            "doctorName",      followUp.getDoctorName() != null ? followUp.getDoctorName() : "",
            "patientName",     followUp.getPatientName() != null ? followUp.getPatientName() : "",
            "department",      followUp.getDepartment() != null ? followUp.getDepartment() : "",
            "appointmentTime", followUp.getAppointmentTime() != null ? followUp.getAppointmentTime().toString() : "",
            "status",          "BOOKED",
            "reason",          followUp.getReason() != null ? followUp.getReason() : "Follow-up"
          ));
        }
      } catch (Exception e) {
        // Log but don't fail — prescription is already saved
        System.err.println("Follow-up appointment booking failed: " + e.getMessage());
      }
    }

    return ResponseEntity.ok(response);
  }

  /**
   * Books a follow-up appointment from prescription data.
   * Uses AppointmentService.bookFollowUpAppointment() which bypasses availability checks
   * since the doctor explicitly chose this slot.
   */
  private Appointment bookFollowUpAppointment(Prescription rx) {
    String dateTimeStr = rx.getFollowUpDate(); // "YYYY-MM-DDTHH:MM"
    LocalDateTime followUpTime;
    try {
      // Supports "YYYY-MM-DDTHH:MM" (no seconds)
      String normalized = dateTimeStr.contains(":") && dateTimeStr.lastIndexOf(":") == dateTimeStr.indexOf("T") + 3
        ? dateTimeStr + ":00"
        : dateTimeStr.length() == 16 ? dateTimeStr + ":00" : dateTimeStr;

      followUpTime = LocalDateTime.parse(normalized,
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"));
    } catch (Exception e) {
      try {
        followUpTime = LocalDateTime.parse(dateTimeStr);
      } catch (Exception ex) {
        System.err.println("Could not parse follow-up datetime: " + dateTimeStr);
        return null;
      }
    }

    Appointment appt = new Appointment();
    appt.setPatientName(rx.getPatientName());
    appt.setPatientId(rx.getPatientId());       // links to patient dashboard
    appt.setDoctorId(rx.getDoctorId());
    appt.setDoctorName(rx.getDoctorName());
    appt.setDepartment(rx.getDepartment());
    appt.setReason("Follow-up: " + (rx.getDiagnosis() != null && !rx.getDiagnosis().isBlank()
      ? rx.getDiagnosis()
      : "Previous Consultation"));
    appt.setAppointmentTime(followUpTime);
    appt.setStatus("BOOKED");

    // bookFollowUpAppointment bypasses availability check — doctor-ordered
    return appointmentService.bookFollowUpAppointment(appt);
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

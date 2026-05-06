package com.supportsystem.majorproject.controller;

import com.supportsystem.majorproject.model.Appointment;
import com.supportsystem.majorproject.model.AppointmentSlot;
import com.supportsystem.majorproject.service.AppointmentService;
import com.supportsystem.majorproject.service.DoctorAvailabilityService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/appointments")
@CrossOrigin("*")
public class AppointmentController {

  private final AppointmentService service;
  private final DoctorAvailabilityService availabilityService;

  public AppointmentController(AppointmentService service,
                                DoctorAvailabilityService availabilityService) {
    this.service = service;
    this.availabilityService = availabilityService;
  }

  /**
   * Book an appointment.
   * Returns 409 CONFLICT if the slot is blocked by the doctor's availability settings.
   */
  @PostMapping("/book")
  public ResponseEntity<?> book(@RequestBody Appointment appointment) {
    try {
      Appointment saved = service.bookAppointment(appointment);
      return ResponseEntity.ok(saved);
    } catch (IllegalStateException e) {
      // Slot is unavailable / doctor not available
      return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(Map.of("error", e.getMessage()));
    } catch (Exception e) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(Map.of("error", "Failed to book appointment: " + e.getMessage()));
    }
  }

  @GetMapping("/doctor/{doctorId}")
  public List<Appointment> getDoctorAppointments(@PathVariable Long doctorId) {
    return service.getAppointmentsForDoctor(doctorId);
  }

  @GetMapping("/slots/{doctorId}")
  public List<AppointmentSlot> getSlots(@PathVariable Long doctorId) {
    return service.getAvailableSlots(doctorId);
  }

  @GetMapping("/patient/{patientName}")
  public List<Appointment> getPatientAppointments(@PathVariable String patientName) {
    return service.getAppointmentsForPatient(patientName);
  }

  /**
   * Returns list of booked time strings for a given doctor on a given date.
   * date param format: YYYY-MM-DD
   * Returns e.g. ["09:00 AM", "10:30 AM"]
   */
  @GetMapping("/booked/{doctorId}")
  public List<String> getBookedSlots(
    @PathVariable Long doctorId,
    @RequestParam String date) {
    return service.getBookedSlotStrings(doctorId, date);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<String> deleteAppointment(@PathVariable Long id) {
    service.deleteAppointment(id);
    return ResponseEntity.ok("Appointment deleted");
  }

  @PatchMapping("/{id}/cancel")
  public ResponseEntity<String> cancelAppointment(@PathVariable Long id) {
    service.cancelAppointment(id);
    return ResponseEntity.ok("Appointment cancelled");
  }
}

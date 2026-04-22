package com.supportsystem.majorproject.controller;

import com.supportsystem.majorproject.model.Appointment;
import com.supportsystem.majorproject.model.AppointmentSlot;
import com.supportsystem.majorproject.service.AppointmentService;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/appointments")
@CrossOrigin("*")
public class AppointmentController {

  private final AppointmentService service;

  public AppointmentController(AppointmentService service) {
    this.service = service;
  }

  @PostMapping("/book")
  public Appointment book(@RequestBody Appointment appointment) {
    return service.bookAppointment(appointment);
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
}

package com.supportsystem.majorproject.controller;

import com.supportsystem.majorproject.model.Appointment;
import com.supportsystem.majorproject.model.AppointmentSlot;
import com.supportsystem.majorproject.service.AppointmentService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

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
}

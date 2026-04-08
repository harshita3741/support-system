package com.supportsystem.majorproject.controller;

import com.supportsystem.majorproject.model.Appointment;
import com.supportsystem.majorproject.service.AppointmentService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/appointments")
@CrossOrigin(origins = "*")
public class AppointmentController {

  private final AppointmentService service;

  public AppointmentController(AppointmentService service) {
    this.service = service;
  }

  // 🔥 BOOK APPOINTMENT
  @PostMapping("/book")
  public Appointment book(@RequestBody Appointment appointment) {
    return service.bookAppointment(appointment);
  }

  // 🔥 FETCH FOR DOCTOR DASHBOARD
  @GetMapping("/doctor/{doctorId}")
  public List<Appointment> getDoctorAppointments(@PathVariable Long doctorId) {
    return service.getAppointmentsForDoctor(doctorId);
  }
}

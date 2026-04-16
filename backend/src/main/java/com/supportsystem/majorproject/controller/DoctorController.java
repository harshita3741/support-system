package com.supportsystem.majorproject.controller;

import com.supportsystem.majorproject.model.Doctor;
import com.supportsystem.majorproject.service.DoctorService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/doctors")
@CrossOrigin(origins = "*")
public class DoctorController {

  private final DoctorService doctorService;

  public DoctorController(DoctorService doctorService) {
    this.doctorService = doctorService;
  }

  @GetMapping
  public List<Doctor> getDoctors() {
    return doctorService.getAllDoctors();
  }
}

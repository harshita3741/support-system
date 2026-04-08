package com.supportsystem.majorproject.controller;

import com.supportsystem.majorproject.model.Doctor;
import com.supportsystem.majorproject.repository.DoctorRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/doctors")
@CrossOrigin("*")
public class DoctorController {

  private final DoctorRepository doctorRepository;

  public DoctorController(DoctorRepository doctorRepository) {
    this.doctorRepository = doctorRepository;
  }

  @GetMapping
  public List<Doctor> getAllDoctors() {
    return doctorRepository.findAll();
  }
}

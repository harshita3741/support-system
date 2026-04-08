package com.supportsystem.majorproject.service;

import com.supportsystem.majorproject.model.Appointment;
import com.supportsystem.majorproject.model.Doctor;
import com.supportsystem.majorproject.repository.AppointmentRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AppointmentService {

  private final AppointmentRepository repository;
  private final DoctorService doctorService;

  public AppointmentService(AppointmentRepository repository,
                            DoctorService doctorService) {
    this.repository = repository;
    this.doctorService = doctorService;
  }

  // ✅ BOOK APPOINTMENT
  public Appointment bookAppointment(Appointment appointment) {

    Doctor doctor = doctorService.assignDoctorByDepartment(appointment.getDepartment());

    if (doctor != null) {
      appointment.setDoctorId(doctor.getDoctorId());
    }

    return repository.save(appointment);
  }

  // ✅ DOCTOR DASHBOARD
  public List<Appointment> getAppointmentsForDoctor(Long doctorId) {
    return repository.findByDoctorId(doctorId);
  }
}

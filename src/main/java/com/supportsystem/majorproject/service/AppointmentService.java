package com.supportsystem.majorproject.service;

import com.supportsystem.majorproject.model.Appointment;
import com.supportsystem.majorproject.model.AppointmentSlot;
import com.supportsystem.majorproject.model.Doctor;
import com.supportsystem.majorproject.repository.AppointmentRepository;
import com.supportsystem.majorproject.repository.SlotRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AppointmentService {

  private final AppointmentRepository repo;
  private final DoctorService doctorService;
  private final SlotRepository slotRepo;

  public AppointmentService(AppointmentRepository repo, DoctorService doctorService, SlotRepository slotRepo) {
    this.repo = repo;
    this.doctorService = doctorService;
    this.slotRepo = slotRepo;
  }

  public Appointment bookAppointment(Appointment appt) {
    // Auto-assign doctor if none specified
    if (appt.getDoctorId() == null && appt.getDepartment() != null) {
      Doctor doctor = doctorService.assignDoctorByDepartment(appt.getDepartment());
      if (doctor != null) {
        appt.setDoctorId(doctor.getDoctorId());
        if (appt.getDoctorName() == null) appt.setDoctorName(doctor.getName());
      }
    }

    appt.setStatus("BOOKED");
    return repo.save(appt);
  }

  public List<Appointment> getAppointmentsForDoctor(Long doctorId) {
    return repo.findByDoctorId(doctorId);
  }

  public List<AppointmentSlot> getAvailableSlots(Long doctorId) {
    return slotRepo.findByDoctorIdAndBookedFalse(doctorId);
  }

  public List<Appointment> getAppointmentsForPatient(String patientName) {
    return repo.findByPatientNameIgnoreCase(patientName);
  }

  /**
   * Returns list of booked time strings (e.g. "09:00 AM") for a given doctor on a given date.
   * date format: YYYY-MM-DD
   */
  public List<String> getBookedSlotStrings(Long doctorId, String date) {
    LocalDate ld = LocalDate.parse(date);
    LocalDateTime start = ld.atStartOfDay();
    LocalDateTime end = ld.atTime(LocalTime.MAX);

    List<Appointment> appointments = repo.findByDoctorIdAndDate(doctorId, start, end);
    DateTimeFormatter fmt = DateTimeFormatter.ofPattern("hh:mm a");
    return appointments.stream()
      .filter(a -> a.getAppointmentTime() != null)
      .map(a -> a.getAppointmentTime().toLocalTime().format(fmt).toUpperCase())
      .collect(Collectors.toList());
  }
}

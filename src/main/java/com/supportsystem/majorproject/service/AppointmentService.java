package com.supportsystem.majorproject.service;

import com.supportsystem.majorproject.model.Appointment;
import com.supportsystem.majorproject.model.AppointmentSlot;
import com.supportsystem.majorproject.model.Doctor;
import com.supportsystem.majorproject.repository.AppointmentRepository;
import com.supportsystem.majorproject.repository.SlotRepository;
import org.springframework.stereotype.Service;
import java.util.List;

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
    Doctor doctor = doctorService.assignDoctorByDepartment(appt.getDepartment());
    if (doctor != null) {
      appt.setDoctorId(doctor.getDoctorId());
    }

    // Mark the slot as booked
    if (appt.getAppointmentTime() != null && appt.getDoctorId() != null) {
      slotRepo.findByDoctorIdAndBookedFalse(appt.getDoctorId())
        .stream()
        .filter(s -> s.getSlotTime().equals(appt.getAppointmentTime()))
        .findFirst()
        .ifPresent(slot -> {
          slot.setBooked(true);
          slotRepo.save(slot);
        });
    }

    return repo.save(appt);
  }

  public List<Appointment> getAppointmentsForDoctor(Long doctorId) {
    return repo.findByDoctorId(doctorId);
  }

  public List<AppointmentSlot> getAvailableSlots(Long doctorId) {
    return slotRepo.findByDoctorIdAndBookedFalse(doctorId);
  }
  public List<Appointment> getAppointmentsForPatient(String patientName) {
    return repo.findByPatientName(patientName);
  }
}

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
  private final DoctorAvailabilityService availabilityService;

  public AppointmentService(AppointmentRepository repo,
                            DoctorService doctorService,
                            SlotRepository slotRepo,
                            DoctorAvailabilityService availabilityService) {
    this.repo = repo;
    this.doctorService = doctorService;
    this.slotRepo = slotRepo;
    this.availabilityService = availabilityService;
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

    // ── Availability check ────────────────────────────────────────────
    if (appt.getDoctorId() != null && appt.getAppointmentTime() != null) {
      String date = appt.getAppointmentTime().toLocalDate().toString(); // "YYYY-MM-DD"
      String timeSlot = appt.getAppointmentTime()
        .toLocalTime()
        .format(DateTimeFormatter.ofPattern("hh:mm a"))
        .toUpperCase(); // "09:00 AM"

      if (!availabilityService.isSlotAvailable(appt.getDoctorId(), date, timeSlot)) {
        throw new IllegalStateException(
          "Doctor is not available for the selected date/time slot. " +
            "Please choose a different slot or doctor.");
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

  /**
   * Book a follow-up appointment that was explicitly scheduled by the doctor during a prescription.
   * Bypasses availability check — the doctor is intentionally setting this slot.
   * Still marks the appointment BOOKED and saves it so it appears on both dashboards.
   */
  public Appointment bookFollowUpAppointment(Appointment appt) {
    // Auto-assign doctor if not already set
    if (appt.getDoctorId() == null && appt.getDepartment() != null) {
      Doctor doctor = doctorService.assignDoctorByDepartment(appt.getDepartment());
      if (doctor != null) {
        appt.setDoctorId(doctor.getDoctorId());
        if (appt.getDoctorName() == null) appt.setDoctorName(doctor.getName());
      }
    }
    appt.setStatus("BOOKED");
    return repo.save(appt);  // no availability check — doctor explicitly chose this slot
  }

  public void deleteAppointment(Long id) {
    repo.deleteById(id);
  }

  public void cancelAppointment(Long id) {
    repo.findById(id).ifPresent(appt -> {
      appt.setStatus("CANCELLED");
      repo.save(appt);
    });
  }
}

package com.supportsystem.majorproject.service;

import com.supportsystem.majorproject.model.Doctor;
import com.supportsystem.majorproject.model.MedicalCase;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class DoctorService {

  private List<Doctor> doctors = new ArrayList<>();

  /**
   * Lazy-injected to avoid circular dependency:
   * DoctorService → DoctorAvailabilityService → DoctorAvailabilityRepository (no loop)
   * AppointmentService → DoctorService (already fine)
   * AppointmentService → DoctorAvailabilityService (fine)
   */
  @Lazy
  @Autowired
  private DoctorAvailabilityService availabilityService;

  public DoctorService() {
    doctors.add(new Doctor(1L, "Dr Smith",   "CARDIO",  true, 0));
    doctors.add(new Doctor(2L, "Dr Adams",   "NEURO",   true, 0));
    doctors.add(new Doctor(3L, "Dr Lee",     "ORTHO",   true, 0));
    doctors.add(new Doctor(4L, "Dr Johnson", "GENERAL", true, 0));
  }

  public void assignDoctor(MedicalCase medicalCase) {
    for (Doctor doctor : doctors) {
      if (doctor.getSpecialty().equals(medicalCase.getDepartment())
          && doctor.isAvailable()
          && isAvailableForConsultation(doctor.getDoctorId())) {
        medicalCase.setAssignedDoctorId(doctor.getDoctorId());
        doctor.setActiveCases(doctor.getActiveCases() + 1);
        System.out.println("Case " + medicalCase.getCaseId()
          + " assigned to " + doctor.getName());
        return;
      }
    }
    // Fallback: assign to first matching specialty even if not AVAILABLE status
    // (so the case isn't dropped silently)
    for (Doctor doctor : doctors) {
      if (doctor.getSpecialty().equals(medicalCase.getDepartment()) && doctor.isAvailable()) {
        medicalCase.setAssignedDoctorId(doctor.getDoctorId());
        doctor.setActiveCases(doctor.getActiveCases() + 1);
        System.out.println("Case " + medicalCase.getCaseId()
          + " assigned to " + doctor.getName() + " (fallback)");
        return;
      }
    }
    System.out.println("No doctor available for case " + medicalCase.getCaseId());
  }

  public Doctor assignDoctorByDepartment(String department) {
    // First try to find a doctor who is AVAILABLE by availability service
    return doctors.stream()
      .filter(d -> d.getSpecialty().equalsIgnoreCase(department)
               && d.isAvailable()
               && isAvailableForConsultation(d.getDoctorId()))
      .findFirst()
      // Fallback: any doctor with matching specialty (ignores availability status)
      .orElseGet(() -> doctors.stream()
        .filter(d -> d.getSpecialty().equalsIgnoreCase(department) && d.isAvailable())
        .findFirst()
        .orElse(null));
  }

  /**
   * Checks DoctorAvailabilityService whether doctor is in AVAILABLE status.
   * Returns true if availability record doesn't exist yet (default = available).
   */
  private boolean isAvailableForConsultation(Long doctorId) {
    try {
      return availabilityService.isDoctorAvailable(doctorId);
    } catch (Exception e) {
      // If availability service fails for any reason, default to available
      return true;
    }
  }

  public List<Doctor> getAllDoctors() {
    return doctors;
  }
}

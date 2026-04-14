package com.supportsystem.majorproject.service;

import com.supportsystem.majorproject.model.Doctor;
import com.supportsystem.majorproject.model.MedicalCase;
import com.supportsystem.majorproject.repository.DoctorRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DoctorService {

  private final DoctorRepository doctorRepository;

  public DoctorService(DoctorRepository doctorRepository) {
    this.doctorRepository = doctorRepository;
  }

  // ✅ Fetch all doctors (for frontend)
  public List<Doctor> getAllDoctors() {
    return doctorRepository.findAll();
  }

  // ✅ Assign doctor when case is created
  public void assignDoctor(MedicalCase mc) {
    List<Doctor> doctors =
      doctorRepository.findBySpecialtyIgnoreCaseAndAvailableTrue(mc.getDepartment());

    if (!doctors.isEmpty()) {
      Doctor d = doctors.get(0);
      mc.setAssignedDoctorId(d.getDoctorId());

      d.setActiveCases(d.getActiveCases() + 1);
      doctorRepository.save(d);
    }
  }

  // ✅ Smart assignment (least workload)
  public Doctor assignDoctorByDepartment(String dept) {

    List<Doctor> doctors =
      doctorRepository.findBySpecialtyIgnoreCaseAndAvailableTrue(dept);

    Doctor selected = null;
    int min = Integer.MAX_VALUE;

    for (Doctor d : doctors) {
      if (d.getActiveCases() < min) {
        min = d.getActiveCases();
        selected = d;
      }
    }

    if (selected != null) {
      selected.setActiveCases(selected.getActiveCases() + 1);
      doctorRepository.save(selected);
    }

    return selected;
  }
}

package com.supportsystem.majorproject.service;

import com.supportsystem.majorproject.model.Doctor;
import com.supportsystem.majorproject.model.MedicalCase;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class DoctorService {

  private List<Doctor> doctors = new ArrayList<>();

  // 🔹 Constructor → initialize doctors
  public DoctorService(){

    doctors.add(new Doctor(1L, "Dr Smith", "CARDIO", true, 0));
    doctors.add(new Doctor(2L, "Dr Adams", "NEURO", true, 0));
    doctors.add(new Doctor(3L, "Dr Lee", "ORTHO", true, 0));
  }

  // 🔹 EXISTING METHOD → for queue system
  public void assignDoctor(MedicalCase medicalCase){

    for(Doctor doctor : doctors){

      if(doctor.getSpecialty().equalsIgnoreCase(medicalCase.getDepartment())
        && doctor.isAvailable()){

        medicalCase.setAssignedDoctorId(doctor.getDoctorId());

        doctor.setActiveCases(doctor.getActiveCases() + 1);

        System.out.println("Case "
          + medicalCase.getCaseId()
          + " assigned to "
          + doctor.getName());

        return;
      }
    }

    System.out.println("No doctor available for case " + medicalCase.getCaseId());
  }

  // 🔥 NEW METHOD → for appointment system (SMART ASSIGNMENT)
  public Doctor assignDoctorByDepartment(String department){

    Doctor selectedDoctor = null;
    int minLoad = Integer.MAX_VALUE;

    for(Doctor doctor : doctors){

      if(doctor.getSpecialty().equalsIgnoreCase(department)
        && doctor.isAvailable()){

        // 🔥 Load balancing logic
        if(doctor.getActiveCases() < minLoad){
          minLoad = doctor.getActiveCases();
          selectedDoctor = doctor;
        }
      }
    }

    if(selectedDoctor != null){

      selectedDoctor.setActiveCases(selectedDoctor.getActiveCases() + 1);

      System.out.println("Appointment assigned to "
        + selectedDoctor.getName());
    }
    else{
      System.out.println("No doctor available for department " + department);
    }

    return selectedDoctor;
  }
}

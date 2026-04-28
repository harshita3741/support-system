package com.supportsystem.majorproject.service;

import com.supportsystem.majorproject.model.Doctor;
import com.supportsystem.majorproject.model.MedicalCase;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class DoctorService {

    private List<Doctor> doctors = new ArrayList<>();

    public DoctorService() {
        doctors.add(new Doctor(1L, "Dr Smith",   "CARDIO",   true, 0));
        doctors.add(new Doctor(2L, "Dr Adams",   "NEURO",    true, 0));
        doctors.add(new Doctor(3L, "Dr Lee",     "ORTHO",    true, 0));
        doctors.add(new Doctor(4L, "Dr Johnson", "GENERAL",  true, 0));
    }

    public void assignDoctor(MedicalCase medicalCase) {
        for (Doctor doctor : doctors) {
            if (doctor.getSpecialty().equals(medicalCase.getDepartment())
                    && doctor.isAvailable()) {
                medicalCase.setAssignedDoctorId(doctor.getDoctorId());
                doctor.setActiveCases(doctor.getActiveCases() + 1);
                System.out.println("Case " + medicalCase.getCaseId()
                        + " assigned to " + doctor.getName());
                return;
            }
        }
        System.out.println("No doctor available for case " + medicalCase.getCaseId());
    }

    /**
     * Returns the first available doctor matching the given department.
     * Used by AppointmentService when booking by department.
     */
    public Doctor assignDoctorByDepartment(String department) {
        return doctors.stream()
                .filter(d -> d.getSpecialty().equalsIgnoreCase(department) && d.isAvailable())
                .findFirst()
                .orElse(null);
    }

    public List<Doctor> getAllDoctors() {
        return doctors;
    }
}

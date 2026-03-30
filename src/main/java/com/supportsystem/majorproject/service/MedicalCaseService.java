package com.supportsystem.majorproject.service;
import com.supportsystem.majorproject.model.MedicalCase;
import com.supportsystem.majorproject.queue.DepartmentQueue;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.supportsystem.majorproject.repository.MedicalCaseRepository;
import java.util.List;

@Service
public class MedicalCaseService {

    @Autowired
    private DepartmentQueue departmentQueue;

    @Autowired

    private MedicalCaseRepository repository;

    public List<MedicalCase> getCasesByDoctor(Long doctorId){
        return repository.findByAssignedDoctorId(doctorId);
    }

    public void createCase(MedicalCase medicalCase){

        medicalCase.setStatus("OPEN");

        departmentQueue.addCase(medicalCase);

        System.out.println("Medical case added to queue: " + medicalCase.getCaseId());
    }
}

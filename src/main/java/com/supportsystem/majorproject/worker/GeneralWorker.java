package com.supportsystem.majorproject.worker;

import com.supportsystem.majorproject.model.MedicalCase;
import com.supportsystem.majorproject.queue.DepartmentQueue;
import com.supportsystem.majorproject.service.DoctorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class GeneralWorker implements Runnable {

    @Autowired
    private DepartmentQueue departmentQueue;

    @Autowired
    private DoctorService doctorService;

    @Override
    public void run() {
        while (true) {
            try {
                MedicalCase medicalCase = departmentQueue.getGeneralCase();
                System.out.println("Processing GENERAL case: " + medicalCase.getCaseId());
                doctorService.assignDoctor(medicalCase);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }
}

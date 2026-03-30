package com.supportsystem.majorproject.controller;

import com.supportsystem.majorproject.model.MedicalCase;
import com.supportsystem.majorproject.service.MedicalCaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/cases")
public class MedicalCaseController {

    @Autowired
    private MedicalCaseService medicalCaseService;

    @PostMapping("/create-batch")
    public String createCases(@RequestBody List<MedicalCase> cases){

        for(MedicalCase mc : cases){
            medicalCaseService.createCase(mc);
        }

        return "Multiple cases created";
    }

    @GetMapping("/doctor/{doctorId}")
    public List<MedicalCase> getDoctorCases(@PathVariable Long doctorId){
        return medicalCaseService.getCasesByDoctor(doctorId);
    }
}
package com.supportsystem.majorproject.controller;

import com.supportsystem.majorproject.model.MedicalCase;
import com.supportsystem.majorproject.service.MedicalCaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/cases")
@CrossOrigin(origins = "*")
public class MedicalCaseController {

    @Autowired
    private MedicalCaseService medicalCaseService;

    @PostMapping("/create-batch")
    public String createCases(@RequestBody List<MedicalCase> cases) {
        for (MedicalCase mc : cases) {
            medicalCaseService.createCase(mc);
        }
        return "Multiple cases created";
    }

    /** Create case with consultation type (VIDEO or CHAT) */
    @PostMapping("/create-with-type")
    public ResponseEntity<Map<String, Object>> createWithType(@RequestBody Map<String, String> body) {
        MedicalCase mc = new MedicalCase();
        mc.setCaseId(System.currentTimeMillis() % 1_000_000_000L);
        mc.setPatientName(body.getOrDefault("patientName", "Patient"));
        mc.setSymptoms(body.getOrDefault("symptoms", ""));
        mc.setDepartment(body.getOrDefault("department", "GENERAL"));
        mc.setConsultationType(body.getOrDefault("consultationType", "VIDEO").toUpperCase());
        medicalCaseService.createCase(mc);

        Map<String, Object> res = new HashMap<>();
        res.put("caseId", mc.getCaseId());
        res.put("status", "OPEN");
        return ResponseEntity.ok(res);
    }

    @GetMapping("/doctor/{doctorId}")
    public List<MedicalCase> getDoctorCases(@PathVariable Long doctorId) {
        return medicalCaseService.getCasesByDoctor(doctorId);
    }

    @GetMapping("/queue")
    public List<MedicalCase> getQueueCases() {
        return medicalCaseService.getQueueCases();
    }

    @GetMapping("/{caseId}/status")
    public ResponseEntity<Map<String, String>> getCaseStatus(@PathVariable Long caseId) {
        MedicalCase mc = medicalCaseService.findById(caseId);
        if (mc == null) return ResponseEntity.notFound().build();
        Map<String, String> res = new HashMap<>();
        res.put("status", mc.getStatus() != null ? mc.getStatus() : "OPEN");
        res.put("caseId", String.valueOf(caseId));
        res.put("consultationType", mc.getConsultationType() != null ? mc.getConsultationType() : "VIDEO");
        return ResponseEntity.ok(res);
    }

    @GetMapping("/{caseId}")
    public ResponseEntity<MedicalCase> getCase(@PathVariable Long caseId) {
        MedicalCase mc = medicalCaseService.findById(caseId);
        if (mc == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(mc);
    }

    @PatchMapping("/{caseId}/accept")
    public String acceptCase(@PathVariable Long caseId, @RequestBody Map<String, String> body) {
        return medicalCaseService.acceptCase(caseId, body.get("doctorId"));
    }

    @PatchMapping("/{caseId}/decline")
    public String declineCase(@PathVariable Long caseId) {
        return medicalCaseService.updateStatus(caseId, "DECLINED");
    }

    @PatchMapping("/{caseId}/end")
    public String endCase(@PathVariable Long caseId) {
        return medicalCaseService.updateStatus(caseId, "ENDED");
    }

    @PatchMapping("/{caseId}/upgrade-to-video")
    public String upgradeToVideo(@PathVariable Long caseId) {
        return medicalCaseService.upgradeToVideo(caseId);
    }

    @PatchMapping("/{caseId}/add-details")
    public ResponseEntity<String> addDetails(
            @PathVariable Long caseId,
            @RequestBody Map<String, String> details) {
        medicalCaseService.appendQuickDetails(caseId,
                details.getOrDefault("duration", ""),
                details.getOrDefault("severity", ""),
                details.getOrDefault("notes", ""));
        return ResponseEntity.ok("Details saved");
    }
}

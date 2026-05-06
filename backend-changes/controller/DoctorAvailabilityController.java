package com.supportsystem.majorproject.controller;

import com.supportsystem.majorproject.model.DoctorAvailability;
import com.supportsystem.majorproject.service.DoctorAvailabilityService;
import com.supportsystem.majorproject.service.DoctorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST endpoints for doctor availability management.
 *
 * Base path: /availability
 *
 * Doctor dashboard calls these to set status, block dates/slots/days, set working hours.
 * Patient appointment page calls GET endpoints to know which slots are blocked.
 * Chatbot calls GET /availability/check-department before creating a case.
 */
@RestController
@RequestMapping("/availability")
@CrossOrigin(origins = "*")
public class DoctorAvailabilityController {

  private final DoctorAvailabilityService service;
  private final DoctorService doctorService;

  public DoctorAvailabilityController(DoctorAvailabilityService service, DoctorService doctorService) {
    this.service = service;
    this.doctorService = doctorService;
  }

  // ── GET all ──────────────────────────────────────────────────────────

  @GetMapping
  public List<DoctorAvailability> getAll() {
    return service.getAll();
  }

  // ── GET single doctor ────────────────────────────────────────────────

  @GetMapping("/{doctorId}")
  public DoctorAvailability get(@PathVariable Long doctorId) {
    return service.get(doctorId);
  }

  // ── GET summary for patient booking page ─────────────────────────────
  // Returns: { isAvailable, dateBlocked, dayBlocked, blockedSlots, workingHoursStart, workingHoursEnd }

  @GetMapping("/{doctorId}/summary")
  public Map<String, Object> getSummary(
      @PathVariable Long doctorId,
      @RequestParam String date) {
    return service.getAvailabilitySummaryForDate(doctorId, date);
  }

  // ── SET STATUS ────────────────────────────────────────────────────────
  // Body: { "status": "AVAILABLE" }   (AVAILABLE | UNAVAILABLE | ON_LEAVE | IN_CONSULTATION)

  @PutMapping("/{doctorId}/status")
  public DoctorAvailability setStatus(
      @PathVariable Long doctorId,
      @RequestBody Map<String, String> body) {
    return service.setStatus(doctorId, body.getOrDefault("status", "AVAILABLE"));
  }

  // ── WORKING HOURS ─────────────────────────────────────────────────────
  // Body: { "start": "09:00", "end": "17:00" }

  @PutMapping("/{doctorId}/working-hours")
  public DoctorAvailability setWorkingHours(
      @PathVariable Long doctorId,
      @RequestBody Map<String, String> body) {
    return service.setWorkingHours(doctorId,
      body.getOrDefault("start", "09:00"),
      body.getOrDefault("end",   "17:00"));
  }

  // ── BLOCK / UNBLOCK DATE ──────────────────────────────────────────────
  // Body: { "date": "2025-12-25" }

  @PostMapping("/{doctorId}/block-date")
  public DoctorAvailability blockDate(
      @PathVariable Long doctorId,
      @RequestBody Map<String, String> body) {
    return service.blockDate(doctorId, body.get("date"));
  }

  @DeleteMapping("/{doctorId}/block-date")
  public DoctorAvailability unblockDate(
      @PathVariable Long doctorId,
      @RequestBody Map<String, String> body) {
    return service.unblockDate(doctorId, body.get("date"));
  }

  // ── BLOCK / UNBLOCK SLOT ──────────────────────────────────────────────
  // Body: { "date": "2025-12-20", "timeSlot": "09:00 AM" }

  @PostMapping("/{doctorId}/block-slot")
  public DoctorAvailability blockSlot(
      @PathVariable Long doctorId,
      @RequestBody Map<String, String> body) {
    return service.blockSlot(doctorId, body.get("date"), body.get("timeSlot"));
  }

  @DeleteMapping("/{doctorId}/block-slot")
  public DoctorAvailability unblockSlot(
      @PathVariable Long doctorId,
      @RequestBody Map<String, String> body) {
    return service.unblockSlot(doctorId, body.get("date"), body.get("timeSlot"));
  }

  // ── BLOCK / UNBLOCK DAY OF WEEK ───────────────────────────────────────
  // Body: { "day": "SATURDAY" }

  @PostMapping("/{doctorId}/block-day")
  public DoctorAvailability blockDay(
      @PathVariable Long doctorId,
      @RequestBody Map<String, String> body) {
    return service.blockDay(doctorId, body.get("day"));
  }

  @DeleteMapping("/{doctorId}/block-day")
  public DoctorAvailability unblockDay(
      @PathVariable Long doctorId,
      @RequestBody Map<String, String> body) {
    return service.unblockDay(doctorId, body.get("day"));
  }

  // ── CHECK single slot (used internally) ───────────────────────────────
  // GET /availability/{doctorId}/check?date=2025-12-20&timeSlot=09:00 AM
  // Returns: { "available": true/false }

  @GetMapping("/{doctorId}/check")
  public ResponseEntity<Map<String, Object>> checkSlot(
      @PathVariable Long doctorId,
      @RequestParam String date,
      @RequestParam String timeSlot) {
    boolean ok = service.isSlotAvailable(doctorId, date, timeSlot);
    return ResponseEntity.ok(Map.of("available", ok, "doctorId", doctorId, "date", date, "timeSlot", timeSlot));
  }

  // ── CHATBOT: check if any doctor is available for a department ─────────
  // GET /availability/check-department?department=CARDIO
  // Returns: { "available": bool, "reason": "AVAILABLE|UNAVAILABLE|ON_LEAVE|IN_CONSULTATION|NO_DOCTORS", "message": "..." }

  @GetMapping("/check-department")
  public ResponseEntity<Map<String, Object>> checkDepartment(@RequestParam String department) {
    Map<String, Object> result = service.checkDepartmentAvailability(
      department, doctorService.getAllDoctors()
    );
    return ResponseEntity.ok(result);
  }
}

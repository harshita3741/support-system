package com.supportsystem.majorproject.service;

import com.supportsystem.majorproject.model.DoctorAvailability;
import com.supportsystem.majorproject.repository.DoctorAvailabilityRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
public class DoctorAvailabilityService {

  private final DoctorAvailabilityRepository repo;

  public DoctorAvailabilityService(DoctorAvailabilityRepository repo) {
    this.repo = repo;
  }

  // ── Get or initialise ─────────────────────────────────────────────────

  @Transactional
  public DoctorAvailability getOrCreate(Long doctorId) {
    return repo.findById(doctorId).orElseGet(() -> {
      DoctorAvailability da = new DoctorAvailability(doctorId);
      da.setStatus("AVAILABLE");
      da.setWorkingHoursStart("09:00");
      da.setWorkingHoursEnd("17:00");
      return repo.save(da);
    });
  }

  public DoctorAvailability get(Long doctorId) {
    return getOrCreate(doctorId);
  }

  public List<DoctorAvailability> getAll() {
    return repo.findAll();
  }

  // ── Status ────────────────────────────────────────────────────────────

  @Transactional
  public DoctorAvailability setStatus(Long doctorId, String status) {
    DoctorAvailability da = getOrCreate(doctorId);
    da.setStatus(status.toUpperCase());
    return repo.save(da);
  }

  // ── Working hours ─────────────────────────────────────────────────────

  @Transactional
  public DoctorAvailability setWorkingHours(Long doctorId, String start, String end) {
    DoctorAvailability da = getOrCreate(doctorId);
    da.setWorkingHoursStart(start);
    da.setWorkingHoursEnd(end);
    return repo.save(da);
  }

  // ── Blocked dates ─────────────────────────────────────────────────────

  @Transactional
  public DoctorAvailability blockDate(Long doctorId, String date) {
    DoctorAvailability da = getOrCreate(doctorId);
    if (!da.getBlockedDates().contains(date)) {
      da.getBlockedDates().add(date);
    }
    return repo.save(da);
  }

  @Transactional
  public DoctorAvailability unblockDate(Long doctorId, String date) {
    DoctorAvailability da = getOrCreate(doctorId);
    da.getBlockedDates().remove(date);
    return repo.save(da);
  }

  // ── Blocked slots ─────────────────────────────────────────────────────

  /** slotKey format: "YYYY-MM-DD:HH:MM AM", e.g. "2025-12-20:09:00 AM" */
  @Transactional
  public DoctorAvailability blockSlot(Long doctorId, String date, String timeSlot) {
    DoctorAvailability da = getOrCreate(doctorId);
    String key = date + ":" + timeSlot;
    if (!da.getBlockedSlots().contains(key)) {
      da.getBlockedSlots().add(key);
    }
    return repo.save(da);
  }

  @Transactional
  public DoctorAvailability unblockSlot(Long doctorId, String date, String timeSlot) {
    DoctorAvailability da = getOrCreate(doctorId);
    da.getBlockedSlots().remove(date + ":" + timeSlot);
    return repo.save(da);
  }

  // ── Blocked days of week ──────────────────────────────────────────────

  @Transactional
  public DoctorAvailability blockDay(Long doctorId, String day) {
    DoctorAvailability da = getOrCreate(doctorId);
    String upper = day.toUpperCase();
    if (!da.getBlockedDays().contains(upper)) {
      da.getBlockedDays().add(upper);
    }
    return repo.save(da);
  }

  @Transactional
  public DoctorAvailability unblockDay(Long doctorId, String day) {
    DoctorAvailability da = getOrCreate(doctorId);
    da.getBlockedDays().remove(day.toUpperCase());
    return repo.save(da);
  }

  // ── Availability checks (used by AppointmentService & DoctorService) ──

  /**
   * Returns true if the doctor is AVAILABLE and the given date+slot is not blocked.
   */
  public boolean isSlotAvailable(Long doctorId, String date, String timeSlot) {
    DoctorAvailability da = getOrCreate(doctorId);

    // Doctor must be in AVAILABLE status
    if (!"AVAILABLE".equalsIgnoreCase(da.getStatus())) {
      return false;
    }

    // Entire date blocked?
    if (da.getBlockedDates().contains(date)) {
      return false;
    }

    // Day-of-week blocked?
    try {
      LocalDate ld = LocalDate.parse(date);
      DayOfWeek dow = ld.getDayOfWeek();
      if (da.getBlockedDays().contains(dow.name())) {
        return false;
      }
    } catch (Exception ignored) {}

    // Specific time slot blocked?
    String key = date + ":" + timeSlot;
    if (da.getBlockedSlots().contains(key)) {
      return false;
    }

    return true;
  }

  /**
   * Returns true if the doctor is generally available for consultation routing
   * (status = AVAILABLE only; does not check individual slots).
   */
  public boolean isDoctorAvailable(Long doctorId) {
    DoctorAvailability da = getOrCreate(doctorId);
    return "AVAILABLE".equalsIgnoreCase(da.getStatus());
  }

  /**
   * Returns blocked slot keys for a doctor on a specific date.
   * Used by the patient appointment page to grey out slots.
   * Format: list of time strings like "09:00 AM"
   */
  public List<String> getBlockedSlotsForDate(Long doctorId, String date) {
    DoctorAvailability da = getOrCreate(doctorId);
    String prefix = date + ":";
    return da.getBlockedSlots().stream()
      .filter(s -> s.startsWith(prefix))
      .map(s -> s.substring(prefix.length()))
      .collect(java.util.stream.Collectors.toList());
  }

  /**
   * Returns a summary map for the patient booking page: isAvailable, blockedDate, blockedDay, blockedSlots.
   */
  public Map<String, Object> getAvailabilitySummaryForDate(Long doctorId, String date) {
    DoctorAvailability da = getOrCreate(doctorId);
    boolean isAvailable = "AVAILABLE".equalsIgnoreCase(da.getStatus());
    boolean dateBlocked = da.getBlockedDates().contains(date);
    boolean dayBlocked  = false;

    try {
      LocalDate ld = LocalDate.parse(date);
      dayBlocked = da.getBlockedDays().contains(ld.getDayOfWeek().name());
    } catch (Exception ignored) {}

    List<String> blockedSlots = getBlockedSlotsForDate(doctorId, date);

    return Map.of(
      "doctorId",    doctorId,
      "status",      da.getStatus(),
      "isAvailable", isAvailable && !dateBlocked && !dayBlocked,
      "dateBlocked", dateBlocked,
      "dayBlocked",  dayBlocked,
      "blockedSlots", blockedSlots,
      "workingHoursStart", da.getWorkingHoursStart(),
      "workingHoursEnd",   da.getWorkingHoursEnd()
    );
  }

  // ── Chatbot: department-level availability ────────────────────────────

  /**
   * Returns a map describing whether ANY doctor in the given department is AVAILABLE.
   * Used by the chatbot before creating a consultation case.
   *
   * doctorList must come from DoctorService.getAllDoctors() — injected by the controller.
   */
  public Map<String, Object> checkDepartmentAvailability(
    String department,
    List<com.supportsystem.majorproject.model.Doctor> allDoctors) {

    // Find doctors in this department
    List<com.supportsystem.majorproject.model.Doctor> deptDoctors = allDoctors.stream()
      .filter(d -> d.getSpecialty().equalsIgnoreCase(department) && d.isAvailable())
      .collect(java.util.stream.Collectors.toList());

    if (deptDoctors.isEmpty()) {
      return Map.of(
        "available", false,
        "reason",    "NO_DOCTORS",
        "message",   "No doctors are registered for the " + department + " department."
      );
    }

    // Check if any doctor in the department has AVAILABLE status
    for (com.supportsystem.majorproject.model.Doctor doc : deptDoctors) {
      DoctorAvailability da = getOrCreate(doc.getDoctorId());
      String status = da.getStatus();

      if ("AVAILABLE".equalsIgnoreCase(status)) {
        return Map.of(
          "available", true,
          "reason",    "AVAILABLE",
          "message",   "Doctor available"
        );
      }
    }

    // All doctors are unavailable — return status of the first one for a meaningful message
    DoctorAvailability first = getOrCreate(deptDoctors.get(0).getDoctorId());
    String firstStatus = first.getStatus();
    String message = switch (firstStatus.toUpperCase()) {
      case "UNAVAILABLE"     -> "The doctor in the " + department + " department is currently unavailable. Please try again later or book an appointment.";
      case "ON_LEAVE"        -> "The doctor in the " + department + " department is currently on leave. Please choose another department or book a future appointment.";
      case "IN_CONSULTATION" -> "The doctor in the " + department + " department is currently in an active consultation. Please wait a few minutes and try again.";
      default                -> "No doctors are available in the " + department + " department right now. Please try again later.";
    };

    return Map.of(
      "available", false,
      "reason",    firstStatus,
      "message",   message
    );
  }
}

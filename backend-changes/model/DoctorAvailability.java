package com.supportsystem.majorproject.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Stores per-doctor availability settings.
 * doctorId is the PK and matches Doctor.doctorId (logical 1:1 relationship).
 *
 * DB tables created automatically by Hibernate (ddl-auto=update):
 *   doctor_availability          – main row per doctor
 *   doctor_blocked_dates         – one row per blocked date  ("2025-12-25")
 *   doctor_blocked_slots         – one row per blocked slot  ("2025-12-20:09:00 AM")
 *   doctor_blocked_days          – one row per blocked weekday ("MONDAY")
 */
@Entity
@Table(name = "doctor_availability")
public class DoctorAvailability {

  @Id
  @Column(name = "doctor_id")
  private Long doctorId;

  /**
   * One of: AVAILABLE | UNAVAILABLE | ON_LEAVE | IN_CONSULTATION
   */
  @Column(name = "status", nullable = false)
  private String status = "AVAILABLE";

  /** Working hours start in 24h format, e.g. "09:00" */
  @Column(name = "working_hours_start")
  private String workingHoursStart = "09:00";

  /** Working hours end in 24h format, e.g. "17:00" */
  @Column(name = "working_hours_end")
  private String workingHoursEnd = "17:00";

  /**
   * Full dates the doctor is unavailable — stored as ISO strings ("2025-12-25").
   */
  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(
    name = "doctor_blocked_dates",
    joinColumns = @JoinColumn(name = "doctor_id")
  )
  @Column(name = "blocked_date")
  private List<String> blockedDates = new ArrayList<>();

  /**
   * Individual time slots blocked on a specific date.
   * Format: "YYYY-MM-DD:HH:MM AM" — e.g. "2025-12-20:09:00 AM"
   */
  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(
    name = "doctor_blocked_slots",
    joinColumns = @JoinColumn(name = "doctor_id")
  )
  @Column(name = "blocked_slot")
  private List<String> blockedSlots = new ArrayList<>();

  /**
   * Days of week the doctor does not work — uppercase English names.
   * e.g. "SATURDAY", "SUNDAY"
   */
  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(
    name = "doctor_blocked_days",
    joinColumns = @JoinColumn(name = "doctor_id")
  )
  @Column(name = "blocked_day")
  private List<String> blockedDays = new ArrayList<>();

  // ── Constructors ──────────────────────────────────────────────────────

  public DoctorAvailability() {}

  public DoctorAvailability(Long doctorId) {
    this.doctorId = doctorId;
  }

  // ── Getters & Setters ─────────────────────────────────────────────────

  public Long getDoctorId()                     { return doctorId; }
  public void setDoctorId(Long doctorId)         { this.doctorId = doctorId; }

  public String getStatus()                      { return status; }
  public void setStatus(String status)           { this.status = status; }

  public String getWorkingHoursStart()           { return workingHoursStart; }
  public void setWorkingHoursStart(String s)     { this.workingHoursStart = s; }

  public String getWorkingHoursEnd()             { return workingHoursEnd; }
  public void setWorkingHoursEnd(String s)       { this.workingHoursEnd = s; }

  public List<String> getBlockedDates()          { return blockedDates; }
  public void setBlockedDates(List<String> l)    { this.blockedDates = l; }

  public List<String> getBlockedSlots()          { return blockedSlots; }
  public void setBlockedSlots(List<String> l)    { this.blockedSlots = l; }

  public List<String> getBlockedDays()           { return blockedDays; }
  public void setBlockedDays(List<String> l)     { this.blockedDays = l; }
}

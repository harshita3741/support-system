package com.supportsystem.majorproject.model;

import jakarta.persistence.*;

/**
 * Prescription entity — updated to include patientId so follow-up
 * appointments can link back to the correct patient record.
 */
@Entity
@Table(name = "prescriptions")
public class Prescription {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private Long caseId;
  private Long doctorId;
  private String doctorName;
  private String department;
  private String patientName;

  /** Patient's login ID (e.g. email) — used when auto-booking follow-up appointment */
  private String patientId;

  private String symptoms;
  private String diagnosis;

  @Column(columnDefinition = "NVARCHAR(MAX)")
  private String medicines;

  private String investigations;
  private String advice;

  /**
   * Follow-up date/time.
   * When only a date is stored:     "2025-12-25"
   * When date+time slot is stored:  "2025-12-25T09:00"  (used to auto-create appointment)
   */
  private String followUpDate;

  private String createdAt;

  // ── Getters & Setters ──────────────────────────────────────────────────

  public Long getId()           { return id; }

  public Long getCaseId()       { return caseId; }
  public void setCaseId(Long caseId) { this.caseId = caseId; }

  public Long getDoctorId()     { return doctorId; }
  public void setDoctorId(Long doctorId) { this.doctorId = doctorId; }

  public String getDoctorName() { return doctorName; }
  public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

  public String getDepartment() { return department; }
  public void setDepartment(String department) { this.department = department; }

  public String getPatientName() { return patientName; }
  public void setPatientName(String patientName) { this.patientName = patientName; }

  public String getPatientId()  { return patientId; }
  public void setPatientId(String patientId) { this.patientId = patientId; }

  public String getSymptoms()   { return symptoms; }
  public void setSymptoms(String symptoms) { this.symptoms = symptoms; }

  public String getDiagnosis()  { return diagnosis; }
  public void setDiagnosis(String diagnosis) { this.diagnosis = diagnosis; }

  public String getMedicines()  { return medicines; }
  public void setMedicines(String medicines) { this.medicines = medicines; }

  public String getInvestigations() { return investigations; }
  public void setInvestigations(String investigations) { this.investigations = investigations; }

  public String getAdvice()     { return advice; }
  public void setAdvice(String advice) { this.advice = advice; }

  public String getFollowUpDate() { return followUpDate; }
  public void setFollowUpDate(String followUpDate) { this.followUpDate = followUpDate; }

  public String getCreatedAt()  { return createdAt; }
  public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}

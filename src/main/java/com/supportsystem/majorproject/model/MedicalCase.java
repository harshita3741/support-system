package com.supportsystem.majorproject.model;

import jakarta.persistence.*;

@Entity
@Table(name = "medical_case")
public class MedicalCase {

  @Id
  @Column(name = "case_id")
  private Long caseId;

  @Column(name = "patient_name")
  private String patientName;

  @Column(name = "patient_id")
  private String patientId;

  private String department;
  private String symptoms;
  private String status;

  @Column(name = "assigned_doctor_id")
  private Long assignedDoctorId;

  @Column(name = "consultation_type")
  private String consultationType;  // VIDEO | CHAT

  public Long getCaseId() { return caseId; }
  public void setCaseId(Long caseId) { this.caseId = caseId; }

  public String getPatientName() { return patientName; }
  public void setPatientName(String patientName) { this.patientName = patientName; }

  public String getPatientId() { return patientId; }
  public void setPatientId(String patientId) { this.patientId = patientId; }

  public String getDepartment() { return department; }
  public void setDepartment(String department) { this.department = department; }

  public String getSymptoms() { return symptoms; }
  public void setSymptoms(String symptoms) { this.symptoms = symptoms; }

  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }

  public Long getAssignedDoctorId() { return assignedDoctorId; }
  public void setAssignedDoctorId(Long assignedDoctorId) { this.assignedDoctorId = assignedDoctorId; }

  public String getConsultationType() { return consultationType; }
  public void setConsultationType(String consultationType) { this.consultationType = consultationType; }
}

package com.supportsystem.majorproject.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class Appointment {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String patientName;
  private Long doctorId;
  private String department;
  private String reason; // 🔥 reason = symptoms
  private LocalDateTime appointmentTime;

  public Long getId() { return id; }

  public String getPatientName() { return patientName; }
  public void setPatientName(String patientName) { this.patientName = patientName; }

  public Long getDoctorId() { return doctorId; }
  public void setDoctorId(Long doctorId) { this.doctorId = doctorId; }

  public String getDepartment() { return department; }
  public void setDepartment(String department) { this.department = department; }

  public String getReason() { return reason; }
  public void setReason(String reason) { this.reason = reason; }

  public LocalDateTime getAppointmentTime() { return appointmentTime; }
  public void setAppointmentTime(LocalDateTime appointmentTime) { this.appointmentTime = appointmentTime; }
}

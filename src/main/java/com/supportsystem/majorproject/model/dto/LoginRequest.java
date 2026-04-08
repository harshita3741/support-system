package com.supportsystem.majorproject.model.dto;

public class LoginRequest {
  private String patientId;
  private String password;
  public String getPatientId() { return patientId; }
  public void setPatientId(String patientId) { this.patientId = patientId; }
  public String getPassword() { return password; }
  public void setPassword(String password) { this.password = password; }
}

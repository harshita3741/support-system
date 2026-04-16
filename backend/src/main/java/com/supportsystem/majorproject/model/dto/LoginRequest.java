package com.supportsystem.majorproject.model.dto;

public class LoginRequest {
  private String patientId;
  private String password;
  public String getPatientId() { return patientId; }
  public void setPatientId(String p) { this.patientId = p; }
  public String getPassword() { return password; }
  public void setPassword(String p) { this.password = p; }
}

package com.supportsystem.majorproject.model.dto;

public class ChatRequest {

  private String message;
  private String patientId;
  private String patientName;

  public ChatRequest() {}

  public String getMessage() { return message; }
  public void setMessage(String message) { this.message = message; }

  public String getPatientId() { return patientId; }
  public void setPatientId(String patientId) { this.patientId = patientId; }

  public String getPatientName() { return patientName; }
  public void setPatientName(String patientName) { this.patientName = patientName; }
}


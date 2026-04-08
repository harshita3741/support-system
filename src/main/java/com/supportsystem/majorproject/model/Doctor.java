package com.supportsystem.majorproject.model;

public class Doctor {

  private Long doctorId;
  private String name;
  private String specialty;
  private boolean available;
  private int activeCases;

  public Doctor(Long doctorId, String name, String specialty, boolean available, int activeCases) {
    this.doctorId = doctorId;
    this.name = name;
    this.specialty = specialty;
    this.available = available;
    this.activeCases = activeCases;
  }

  public Long getDoctorId() { return doctorId; }

  public String getName() { return name; }

  public String getSpecialty() { return specialty; }

  public boolean isAvailable() { return available; }

  public void setAvailable(boolean available) { this.available = available; }

  public int getActiveCases() { return activeCases; }

  public void setActiveCases(int activeCases) { this.activeCases = activeCases; }
}

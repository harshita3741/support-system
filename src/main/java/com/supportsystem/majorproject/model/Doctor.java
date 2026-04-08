package com.supportsystem.majorproject.model;

import jakarta.persistence.*;

@Entity
@Table(name = "doctors")
public class Doctor {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long doctorId;

  private String name;
  private String specialty;
  private boolean available;
  private int activeCases;

  public Doctor() {}

  public Doctor(String name, String specialty, boolean available, int activeCases) {
    this.name = name;
    this.specialty = specialty;
    this.available = available;
    this.activeCases = activeCases;
  }

  // getters and setters (same as before, doctorId is now Long with @Id)
  public Long getDoctorId() { return doctorId; }
  public String getName() { return name; }
  public String getSpecialty() { return specialty; }
  public boolean isAvailable() { return available; }
  public void setAvailable(boolean available) { this.available = available; }
  public int getActiveCases() { return activeCases; }
  public void setActiveCases(int activeCases) { this.activeCases = activeCases; }
}

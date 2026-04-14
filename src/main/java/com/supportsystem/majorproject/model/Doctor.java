package com.supportsystem.majorproject.model;

import jakarta.persistence.*;

@Entity
@Table(name = "doctors")
public class Doctor {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "doctor_id")
  private Long doctorId;

  private String name;

  private String specialty;

  private boolean available;

  @Column(name = "active_cases")
  private int activeCases;

  public Doctor() {}

  public Doctor(String name, String specialty, boolean available, int activeCases) {
    this.name = name;
    this.specialty = specialty;
    this.available = available;
    this.activeCases = activeCases;
  }

  public Long getDoctorId() { return doctorId; }
  public String getName() { return name; }
  public String getSpecialty() { return specialty; }
  public boolean isAvailable() { return available; }
  public int getActiveCases() { return activeCases; }

  public void setDoctorId(Long doctorId) { this.doctorId = doctorId; }
  public void setName(String name) { this.name = name; }
  public void setSpecialty(String specialty) { this.specialty = specialty; }
  public void setAvailable(boolean available) { this.available = available; }
  public void setActiveCases(int activeCases) { this.activeCases = activeCases; }
}

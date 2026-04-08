package com.supportsystem.majorproject.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "appointment_slots")
public class AppointmentSlot {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private Long doctorId;
  private LocalDateTime slotTime;     // e.g. 2026-06-10T10:00
  private boolean booked;

  public Long getId() { return id; }
  public Long getDoctorId() { return doctorId; }
  public void setDoctorId(Long doctorId) { this.doctorId = doctorId; }
  public LocalDateTime getSlotTime() { return slotTime; }
  public void setSlotTime(LocalDateTime slotTime) { this.slotTime = slotTime; }
  public boolean isBooked() { return booked; }
  public void setBooked(boolean booked) { this.booked = booked; }
}

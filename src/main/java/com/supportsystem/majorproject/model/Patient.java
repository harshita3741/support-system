package com.supportsystem.majorproject.model;

import jakarta.persistence.*;

@Entity
@Table(name = "patients")
public class Patient {

  @Id
  private String patientId;
  private String fullName;
  private String email;
  private String phone;
  private String password;
  private String gender;
  private String dob;
  private String emergencyContact;
  private String bloodGroup;
  private Double height;
  private Double weight;
  private Double bmi;
  private String allergies;
  private String chronicConditions;
  private String smokingHabit;
  private String alcoholConsumption;
  private String activityLevel;
  private String sleepHours;
  private String dietType;
  private String waterIntake;
  private String pastIllness;
  private String previousSurgeries;
  private String familyHistory;
  private String ongoingTreatments;
  private String hospitalizations;
  private String city;
  private String state;
  private String pinCode;
  private String registrationDate;

  public String getPatientId() { return patientId; }
  public void setPatientId(String patientId) { this.patientId = patientId; }
  public String getFullName() { return fullName; }
  public void setFullName(String fullName) { this.fullName = fullName; }
  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
  public String getPhone() { return phone; }
  public void setPhone(String phone) { this.phone = phone; }
  public String getPassword() { return password; }
  public void setPassword(String password) { this.password = password; }
  public String getGender() { return gender; }
  public void setGender(String gender) { this.gender = gender; }
  public String getDob() { return dob; }
  public void setDob(String dob) { this.dob = dob; }
  public String getEmergencyContact() { return emergencyContact; }
  public void setEmergencyContact(String e) { this.emergencyContact = e; }
  public String getBloodGroup() { return bloodGroup; }
  public void setBloodGroup(String bloodGroup) { this.bloodGroup = bloodGroup; }
  public Double getHeight() { return height; }
  public void setHeight(Double height) { this.height = height; }
  public Double getWeight() { return weight; }
  public void setWeight(Double weight) { this.weight = weight; }
  public Double getBmi() { return bmi; }
  public void setBmi(Double bmi) { this.bmi = bmi; }
  public String getAllergies() { return allergies; }
  public void setAllergies(String allergies) { this.allergies = allergies; }
  public String getChronicConditions() { return chronicConditions; }
  public void setChronicConditions(String c) { this.chronicConditions = c; }
  public String getSmokingHabit() { return smokingHabit; }
  public void setSmokingHabit(String s) { this.smokingHabit = s; }
  public String getAlcoholConsumption() { return alcoholConsumption; }
  public void setAlcoholConsumption(String a) { this.alcoholConsumption = a; }
  public String getActivityLevel() { return activityLevel; }
  public void setActivityLevel(String a) { this.activityLevel = a; }
  public String getSleepHours() { return sleepHours; }
  public void setSleepHours(String s) { this.sleepHours = s; }
  public String getDietType() { return dietType; }
  public void setDietType(String d) { this.dietType = d; }
  public String getWaterIntake() { return waterIntake; }
  public void setWaterIntake(String w) { this.waterIntake = w; }
  public String getPastIllness() { return pastIllness; }
  public void setPastIllness(String p) { this.pastIllness = p; }
  public String getPreviousSurgeries() { return previousSurgeries; }
  public void setPreviousSurgeries(String p) { this.previousSurgeries = p; }
  public String getFamilyHistory() { return familyHistory; }
  public void setFamilyHistory(String f) { this.familyHistory = f; }
  public String getOngoingTreatments() { return ongoingTreatments; }
  public void setOngoingTreatments(String o) { this.ongoingTreatments = o; }
  public String getHospitalizations() { return hospitalizations; }
  public void setHospitalizations(String h) { this.hospitalizations = h; }
  public String getCity() { return city; }
  public void setCity(String city) { this.city = city; }
  public String getState() { return state; }
  public void setState(String state) { this.state = state; }
  public String getPinCode() { return pinCode; }
  public void setPinCode(String pinCode) { this.pinCode = pinCode; }
  public String getRegistrationDate() { return registrationDate; }
  public void setRegistrationDate(String r) { this.registrationDate = r; }
}

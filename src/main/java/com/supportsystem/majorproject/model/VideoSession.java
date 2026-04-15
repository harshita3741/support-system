package com.supportsystem.majorproject.model;

import jakarta.persistence.*;

@Entity
@Table(name = "video_sessions")
public class VideoSession {

  @Id
  @Column(name = "case_id")
  private Long caseId;

  @Column(name = "offer_sdp", columnDefinition = "NVARCHAR(MAX)")
  private String offerSdp;

  @Column(name = "answer_sdp", columnDefinition = "NVARCHAR(MAX)")
  private String answerSdp;

  @Column(name = "patient_candidates", columnDefinition = "NVARCHAR(MAX)")
  private String patientCandidates;

  @Column(name = "doctor_candidates", columnDefinition = "NVARCHAR(MAX)")
  private String doctorCandidates;

  private String status; // OFFERED, ANSWERED

  public VideoSession() {}

  public Long getCaseId() { return caseId; }
  public void setCaseId(Long caseId) { this.caseId = caseId; }

  public String getOfferSdp() { return offerSdp; }
  public void setOfferSdp(String offerSdp) { this.offerSdp = offerSdp; }

  public String getAnswerSdp() { return answerSdp; }
  public void setAnswerSdp(String answerSdp) { this.answerSdp = answerSdp; }

  public String getPatientCandidates() { return patientCandidates; }
  public void setPatientCandidates(String patientCandidates) { this.patientCandidates = patientCandidates; }

  public String getDoctorCandidates() { return doctorCandidates; }
  public void setDoctorCandidates(String doctorCandidates) { this.doctorCandidates = doctorCandidates; }

  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
}

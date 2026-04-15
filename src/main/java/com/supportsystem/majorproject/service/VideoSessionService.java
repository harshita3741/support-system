package com.supportsystem.majorproject.service;

import com.supportsystem.majorproject.model.VideoSession;
import com.supportsystem.majorproject.repository.VideoSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class VideoSessionService {

  @Autowired
  private VideoSessionRepository repository;

  private VideoSession getOrCreate(Long caseId) {
    return repository.findById(caseId).orElseGet(() -> {
      VideoSession vs = new VideoSession();
      vs.setCaseId(caseId);
      vs.setPatientCandidates("[]");
      vs.setDoctorCandidates("[]");
      return vs;
    });
  }

  public void postOffer(Long caseId, String sdp) {
    VideoSession vs = getOrCreate(caseId);
    vs.setOfferSdp(sdp);
    vs.setStatus("OFFERED");
    repository.save(vs);
  }

  public String getOffer(Long caseId) {
    return repository.findById(caseId).map(VideoSession::getOfferSdp).orElse(null);
  }

  public void postAnswer(Long caseId, String sdp) {
    VideoSession vs = getOrCreate(caseId);
    vs.setAnswerSdp(sdp);
    vs.setStatus("ANSWERED");
    repository.save(vs);
  }

  public String getAnswer(Long caseId) {
    return repository.findById(caseId).map(VideoSession::getAnswerSdp).orElse(null);
  }

  public void addCandidate(Long caseId, String role, String candidate) {
    VideoSession vs = getOrCreate(caseId);
    if ("patient".equals(role)) {
      String existing = vs.getPatientCandidates() != null ? vs.getPatientCandidates() : "[]";
      vs.setPatientCandidates(appendToJsonArray(existing, candidate));
    } else {
      String existing = vs.getDoctorCandidates() != null ? vs.getDoctorCandidates() : "[]";
      vs.setDoctorCandidates(appendToJsonArray(existing, candidate));
    }
    repository.save(vs);
  }

  public String getCandidates(Long caseId, String role) {
    VideoSession vs = repository.findById(caseId).orElse(null);
    if (vs == null) return "[]";
    String result = "patient".equals(role) ? vs.getPatientCandidates() : vs.getDoctorCandidates();
    return result != null ? result : "[]";
  }

  private String appendToJsonArray(String jsonArray, String item) {
    // Safely append item to JSON array string
    String trimmed = jsonArray.trim();
    if (trimmed.equals("[]")) {
      return "[" + item + "]";
    }
    return trimmed.substring(0, trimmed.length() - 1) + "," + item + "]";
  }
}

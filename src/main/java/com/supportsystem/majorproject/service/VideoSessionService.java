package com.supportsystem.majorproject.service;

import com.supportsystem.majorproject.model.VideoSession;
import com.supportsystem.majorproject.repository.VideoSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class VideoSessionService {

  @Autowired
  private VideoSessionRepository repository;

  /** Patient posts their SDP offer — atomic upsert, no race condition */
  public void postOffer(Long caseId, String sdp) {
    repository.upsertOffer(caseId, sdp);
  }

  /** Doctor reads patient's SDP offer */
  public String getOffer(Long caseId) {
    return repository.findById(caseId).map(VideoSession::getOfferSdp).orElse(null);
  }

  /** Doctor posts their SDP answer — atomic upsert */
  public void postAnswer(Long caseId, String sdp) {
    repository.upsertAnswer(caseId, sdp);
  }

  /** Patient reads doctor's SDP answer */
  public String getAnswer(Long caseId) {
    return repository.findById(caseId).map(VideoSession::getAnswerSdp).orElse(null);
  }

  /** Either side posts an ICE candidate — atomic append to JSON array in DB */
  public void addCandidate(Long caseId, String role, String candidate) {
    if ("patient".equals(role)) {
      repository.appendPatientCandidate(caseId, candidate);
    } else {
      repository.appendDoctorCandidate(caseId, candidate);
    }
  }

  /** Either side reads the other's ICE candidates */
  public String getCandidates(Long caseId, String role) {
    VideoSession vs = repository.findById(caseId).orElse(null);
    if (vs == null) return "[]";
    String result = "patient".equals(role) ? vs.getPatientCandidates() : vs.getDoctorCandidates();
    return result != null ? result : "[]";
  }
}

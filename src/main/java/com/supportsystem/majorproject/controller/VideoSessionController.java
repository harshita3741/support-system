package com.supportsystem.majorproject.controller;

import com.supportsystem.majorproject.service.VideoSessionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/video-sessions")
@CrossOrigin(origins = "*")
public class VideoSessionController {

  @Autowired
  private VideoSessionService videoSessionService;

  @PostMapping("/{caseId}/offer")
  public ResponseEntity<Map<String, String>> postOffer(
    @PathVariable Long caseId,
    @RequestBody Map<String, String> body) {
    videoSessionService.postOffer(caseId, body.get("sdp"));
    return ResponseEntity.ok(Map.of("status", "ok"));
  }

  @GetMapping("/{caseId}/offer")
  public ResponseEntity<Map<String, String>> getOffer(@PathVariable Long caseId) {
    String sdp = videoSessionService.getOffer(caseId);
    if (sdp == null) return ResponseEntity.notFound().build();
    return ResponseEntity.ok(Map.of("sdp", sdp));
  }

  @PostMapping("/{caseId}/answer")
  public ResponseEntity<Map<String, String>> postAnswer(
    @PathVariable Long caseId,
    @RequestBody Map<String, String> body) {
    videoSessionService.postAnswer(caseId, body.get("sdp"));
    return ResponseEntity.ok(Map.of("status", "ok"));
  }

  @GetMapping("/{caseId}/answer")
  public ResponseEntity<Map<String, String>> getAnswer(@PathVariable Long caseId) {
    String sdp = videoSessionService.getAnswer(caseId);
    if (sdp == null) return ResponseEntity.notFound().build();
    return ResponseEntity.ok(Map.of("sdp", sdp));
  }

  @PostMapping("/{caseId}/candidate/{role}")
  public ResponseEntity<Map<String, String>> addCandidate(
    @PathVariable Long caseId,
    @PathVariable String role,
    @RequestBody Map<String, String> body) {
    videoSessionService.addCandidate(caseId, role, body.get("candidate"));
    return ResponseEntity.ok(Map.of("status", "ok"));
  }

  @GetMapping("/{caseId}/candidates/{role}")
  public ResponseEntity<String> getCandidates(
    @PathVariable Long caseId,
    @PathVariable String role) {
    String candidates = videoSessionService.getCandidates(caseId, role);
    return ResponseEntity.ok(candidates);
  }
}

package com.supportsystem.majorproject.service;

import com.supportsystem.majorproject.model.MedicalCase;
import com.supportsystem.majorproject.model.dto.ChatResponse;
import com.supportsystem.majorproject.model.entity.ChatMessage;
import com.supportsystem.majorproject.repository.ChatRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class ChatService {

  private final ChatRepository chatRepository;
  private final MedicalCaseService medicalCaseService;

  public ChatService(ChatRepository chatRepository, MedicalCaseService medicalCaseService) {
    this.chatRepository = chatRepository;
    this.medicalCaseService = medicalCaseService;
  }

  public ChatResponse getChatResponse(String message, String patientName, String patientId) {

    String msg = message.toLowerCase()
      .replaceAll("[^a-z0-9 ]", " ")  // strip punctuation
      .replaceAll("\\s+", " ")
      .trim();

    String department = null;
    String responseText;
    boolean isEmergency = false;

    // ─── helper: loose keyword check ─────────────────────────────
    // Returns true if the message contains any of the given fragments
    java.util.function.Predicate<String[]> has = (keywords) -> {
      for (String kw : keywords) {
        if (msg.contains(kw)) return true;
      }
      return false;
    };

    // 🚨 EMERGENCY DETECTION
    if (has.test(new String[]{"severe chest", "heart attack", "unable to breath", "cant breath",
      "cannot breath", "no breath", "emergency", "ambulance"})) {
      department = "CARDIO";
      isEmergency = true;
      responseText = "🚨 This may be a serious condition. Please seek immediate medical attention.";
    }
    // 🫀 CARDIO — heart / chest related
    else if (has.test(new String[]{"chest pain", "chest ache", "heart", "cardiac", "cardio",
      "palpitat", "pressure in chest", "tight chest", "cardiol"})) {
      department = "CARDIO";
      responseText = "You may be experiencing a cardiac issue. A cardiologist is recommended.";
    }
    // 🧠 NEURO — head / brain / nerve related
    else if (has.test(new String[]{"headach", "head ach", "head pain", "head hurt", "heaache",
      "migrain", "dizzin", "dizzy", "vertigo", "nausea", "vomit", "faint",
      "seizure", "convuls", "numbness", "tingling", "memory", "confus",
      "neuro", "neurolog", "brain", "nerve", "spine", "spinal"})) {
      department = "NEURO";
      responseText = "This could be a neurological issue. Please consult a neurologist.";
    }
    // 🦴 ORTHO — bone / joint / muscle related
    else if (has.test(new String[]{"fracture", "broken bone", "bone pain", "joint pain",
      "joint ache", "knee pain", "back pain", "shoulder pain", "hip pain",
      "ankle", "wrist pain", "sprain", "ligament", "ortho", "orthoped",
      "muscle pain", "swollen joint", "arthrit"})) {
      department = "ORTHO";
      responseText = "This appears to be an orthopedic issue. Consult an orthopedic specialist.";
    }
    // 🤒 GENERAL — fever / cold / infection
    else if (has.test(new String[]{"fever", "cold", "cough", "flu", "sore throat",
      "runny nose", "sneezing", "body ache", "chills", "infection", "viral",
      "fatigue", "tired", "weak", "stomach", "abdomen", "diarrhea", "vomiting"})) {
      responseText = "This may be a general infection. Stay hydrated and monitor your symptoms.";
    }
    else {
      responseText = "Please describe your symptoms in more detail. For example: headache, chest pain, fever, joint pain, etc.";
    }

    Long createdCaseId = null;

    // 🚀 AUTO CASE CREATION
    if (department != null) {
      MedicalCase mc = new MedicalCase();
      long caseId = System.currentTimeMillis();
      mc.setCaseId(caseId);
      mc.setPatientName(patientName != null && !patientName.isEmpty() ? patientName : "Patient");
      mc.setSymptoms(message);
      mc.setDepartment(department);

      medicalCaseService.createCase(mc);
      createdCaseId = caseId;

      responseText += " ✅ Your case has been registered and assigned to the " + department + " department.";
    }

    // 💬 FOLLOW-UP SUGGESTION
    if (!isEmergency && department != null) {
      responseText += " A doctor from the " + department + " team will connect with you shortly.";
    }

    // 💾 SAVE CHAT
    ChatMessage chat = new ChatMessage();
    chat.setUserMessage(message);
    chat.setBotResponse(responseText);
    chat.setTimestamp(LocalDateTime.now());
    chatRepository.save(chat);

    return new ChatResponse(responseText, createdCaseId, department);
  }

  // Keep old method for backward compatibility
  public String getResponse(String message) {
    return getChatResponse(message, "Patient", null).getMessage();
  }
}

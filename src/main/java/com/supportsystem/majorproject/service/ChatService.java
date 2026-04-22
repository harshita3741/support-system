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
      responseText = "🚨 This sounds like a medical emergency. Please call emergency services immediately or go to the nearest ER. I am connecting you to a cardiologist right now.";
    }
    // 🫀 CARDIO — heart / chest related
    else if (has.test(new String[]{"chest pain", "chest ache", "heart", "cardiac", "cardio",
      "palpitat", "pressure in chest", "tight chest", "cardiol"})) {
      department = "CARDIO";
      responseText = "I understand you're experiencing chest or heart-related symptoms. Our Cardiology team can help you. Please choose how you'd like to connect with a cardiologist:";
    }
    // 🧠 NEURO — head / brain / nerve related
    else if (has.test(new String[]{"headach", "head ach", "head pain", "head hurt", "heaache",
      "migrain", "dizzin", "dizzy", "vertigo", "nausea", "vomit", "faint",
      "seizure", "convuls", "numbness", "tingling", "memory", "confus",
      "neuro", "neurolog", "brain", "nerve", "spine", "spinal"})) {
      department = "NEURO";
      responseText = "I understand you're experiencing neurological symptoms such as headache, dizziness, or nerve-related discomfort. Our Neurology team can assist you. Please choose how you'd like to connect with a neurologist:";
    }
    // 🦴 ORTHO — bone / joint / muscle related
    else if (has.test(new String[]{"fracture", "broken bone", "bone pain", "joint pain",
      "joint ache", "knee pain", "back pain", "shoulder pain", "hip pain",
      "ankle", "wrist pain", "sprain", "ligament", "ortho", "orthoped",
      "muscle pain", "swollen joint", "arthrit"})) {
      department = "ORTHO";
      responseText = "I see you're dealing with bone, joint, or muscle-related pain. Our Orthopedics team is here to help. Please choose how you'd like to connect with a specialist:";
    }
    // 🤒 GENERAL — fever / cold / infection
    else if (has.test(new String[]{"fever", "cold", "cough", "flu", "sore throat",
      "runny nose", "sneezing", "body ache", "chills", "infection", "viral",
      "fatigue", "tired", "weak", "stomach", "abdomen", "diarrhea", "vomiting"})) {
      responseText = "These symptoms are common with infections or viral illnesses. Make sure to stay hydrated, rest well, and monitor your temperature. If symptoms worsen or persist beyond 3 days, please consult a doctor. Would you like to describe your symptoms in more detail?";
    }
    else {
      responseText = "Thank you for reaching out! Could you describe your symptoms in a bit more detail? For example: Do you have a headache, chest pain, fever, joint pain, or any other discomfort? The more details you share, the better I can help.";
    }

    // 💾 SAVE CHAT
    ChatMessage chat = new ChatMessage();
    chat.setUserMessage(message);
    chat.setBotResponse(responseText);
    chat.setTimestamp(LocalDateTime.now());
    chatRepository.save(chat);

    // 🚀 DEPARTMENT DETECTED → ask patient for consultation type (Video or Chat)
    // Emergency cases bypass choice and go straight to video
    if (department != null && isEmergency) {
      MedicalCase mc = new MedicalCase();
      long caseId = System.currentTimeMillis();
      mc.setCaseId(caseId);
      mc.setPatientName(patientName != null && !patientName.isEmpty() ? patientName : "Patient");
      mc.setSymptoms(message);
      mc.setDepartment(department);
      mc.setConsultationType("VIDEO");
      medicalCaseService.createCase(mc);
      responseText += " ✅ Case registered — " + department + " dept. A doctor will connect with you immediately.";
      return new ChatResponse(responseText, caseId, department);
    }

    if (department != null) {
      // Don't create case yet — ask the patient how they want to consult
      ChatResponse resp = new ChatResponse(responseText, null, department);
      resp.setAwaitingConsultationType(true);
      resp.setPendingSymptoms(message);
      return resp;
    }

    return new ChatResponse(responseText, null, null);
  }

  // Keep old method for backward compatibility
  public String getResponse(String message) {
    return getChatResponse(message, "Patient", null).getMessage();
  }
}

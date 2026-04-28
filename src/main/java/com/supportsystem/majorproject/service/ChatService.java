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
      .replaceAll("[^a-z0-9 ]", " ")
      .replaceAll("\\s+", " ")
      .trim();

    String department = null;
    String responseText;
    boolean isEmergency = false;

    java.util.function.Predicate<String[]> has = (keywords) -> {
      for (String kw : keywords) {
        if (msg.contains(kw)) return true;
      }
      return false;
    };

    // 🚨 EMERGENCY
    if (has.test(new String[]{"severe chest", "heart attack", "unable to breath", "cant breath",
      "cannot breath", "no breath", "emergency", "ambulance"})) {
      department = "CARDIO";
      isEmergency = true;
      responseText = "🚨 This sounds like a medical emergency. Please call emergency services immediately or go to the nearest ER. Connecting you to a cardiologist right now.";
    }
    // 🫀 CARDIO
    else if (has.test(new String[]{"chest pain", "chest ache", "heart", "cardiac", "cardio",
      "palpitat", "pressure in chest", "tight chest", "cardiol"})) {
      department = "CARDIO";
      responseText = "I understand you're experiencing chest or heart-related symptoms. Our Cardiology team can help. Please choose how you'd like to connect with a cardiologist:";
    }
    // 🧠 NEURO — serious neurological only (NOT headache/fever)
    else if (has.test(new String[]{"head injury", "head trauma", "numbness", "paralysis", "numb",
      "paralys", "stroke", "seizure", "convuls", "tremor", "loss of speech",
      "slurred speech", "facial droop", "nerve damage", "neuro", "neurolog"})) {
      department = "NEURO";
      responseText = "I understand you're experiencing neurological symptoms. Our Neurology team specialises in these conditions. Please choose how you'd like to connect with a neurologist:";
    }
    // 🦴 ORTHO
    else if (has.test(new String[]{"fracture", "broken bone", "bone pain", "joint pain",
      "joint ache", "knee pain", "back pain", "shoulder pain", "hip pain",
      "ankle", "wrist pain", "sprain", "ligament", "ortho", "orthoped",
      "muscle pain", "swollen joint", "arthrit"})) {
      department = "ORTHO";
      responseText = "I see you're dealing with bone, joint, or muscle-related pain. Our Orthopedics team is here to help. Please choose how you'd like to connect with a specialist:";
    }
    // 🩺 GENERAL — headache, fever, cold, infection, digestive, fatigue
    else if (has.test(new String[]{"headach", "head ach", "head pain", "head hurt", "heaache",
      "migrain", "dizzin", "dizzy", "vertigo", "nausea", "vomit", "faint",
      "fever", "cold", "cough", "flu", "sore throat", "runny nose", "sneezing",
      "body ache", "chills", "infection", "viral", "fatigue", "tired", "weak",
      "stomach", "abdomen", "diarrhea", "vomiting", "general", "skin rash",
      "rash", "allerg", "constipat", "indigestion", "gas", "bloating"})) {
      department = "GENERAL";
      responseText = "I understand you're feeling unwell. Our General Physician can help with these symptoms. Please choose how you'd like to connect:";
    }
    else {
      responseText = "Thank you for reaching out! Could you describe your symptoms in more detail? For example: Do you have a headache, chest pain, fever, joint pain, or any other discomfort?";
    }

    ChatMessage chat = new ChatMessage();
    chat.setUserMessage(message);
    chat.setBotResponse(responseText);
    chat.setTimestamp(LocalDateTime.now());
    chatRepository.save(chat);

    if (department != null && isEmergency) {
      MedicalCase mc = new MedicalCase();
      long caseId = System.currentTimeMillis();
      mc.setCaseId(caseId);
      mc.setPatientName(patientName != null && !patientName.isEmpty() ? patientName : "Patient");
      mc.setSymptoms(message);
      mc.setDepartment(department);
      mc.setConsultationType("VIDEO");
      medicalCaseService.createCase(mc);
      responseText += " ✅ Case registered — " + department + " dept.";
      return new ChatResponse(responseText, caseId, department);
    }

    if (department != null) {
      ChatResponse resp = new ChatResponse(responseText, null, department);
      resp.setAwaitingConsultationType(true);
      resp.setPendingSymptoms(message);
      return resp;
    }

    return new ChatResponse(responseText, null, null);
  }

  public String getResponse(String message) {
    return getChatResponse(message, "Patient", null).getMessage();
  }
}

package com.supportsystem.majorproject.service;

import com.supportsystem.majorproject.model.MedicalCase;
import com.supportsystem.majorproject.model.entity.ChatMessage;
import com.supportsystem.majorproject.repository.ChatRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class ChatService {

  private final ChatRepository chatRepository;
  private final MedicalCaseService medicalCaseService;

  public ChatService(ChatRepository chatRepository,
                     MedicalCaseService medicalCaseService) {
    this.chatRepository = chatRepository;
    this.medicalCaseService = medicalCaseService;
  }

  public String getResponse(String message) {

    String msg = message.toLowerCase();
    String department = null;
    String response;
    boolean isEmergency = false;

    // 🚨 EMERGENCY DETECTION
    if (msg.contains("severe chest pain") || msg.contains("heart attack") || msg.contains("unable to breathe")) {
      department = "CARDIO";
      isEmergency = true;
      response = "🚨 This may be a serious condition. Please seek immediate medical attention.";
    }

    // 🫀 CARDIO
    else if (msg.contains("chest pain") || msg.contains("heart") || msg.contains("pressure in chest")) {
      department = "CARDIO";
      response = "You may be experiencing a cardiac issue. A cardiologist is recommended.";
    }

    // 🧠 NEURO
    else if (msg.contains("headache") || msg.contains("dizziness") || msg.contains("migraine")) {
      department = "NEURO";
      response = "This could be a neurological issue. Please consult a neurologist.";
    }

    // 🦴 ORTHO
    else if (msg.contains("fracture") || msg.contains("bone pain") || msg.contains("joint pain")) {
      department = "ORTHO";
      response = "This appears to be an orthopedic issue. Consult an orthopedic specialist.";
    }

    // 🤒 GENERAL
    else if (msg.contains("fever") || msg.contains("cold") || msg.contains("cough")) {
      response = "This may be a general infection. Stay hydrated and monitor your symptoms.";
    }

    else {
      response = "Please describe your symptoms in more detail so I can assist you better.";
    }

    // 🚀 AUTO CASE CREATION
    if (department != null) {
      MedicalCase mc = new MedicalCase();
      mc.setCaseId(System.currentTimeMillis());
      mc.setPatientName("ChatUser");
      mc.setSymptoms(message);
      mc.setDepartment(department);

      medicalCaseService.createCase(mc);

      response += " ✅ Your case has been registered and assigned to the " + department + " department.";
    }

    // 💬 FOLLOW-UP SUGGESTION
    if (!isEmergency && department != null) {
      response += " Would you like to book an appointment?";
    }

    // 💾 SAVE CHAT
    ChatMessage chat = new ChatMessage();
    chat.setUserMessage(message);
    chat.setBotResponse(response);
    chat.setTimestamp(LocalDateTime.now());

    chatRepository.save(chat);

    return response;
  }
}

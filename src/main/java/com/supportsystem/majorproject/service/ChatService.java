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

    String msg = message.toLowerCase();
    String department = null;
    String responseText;
    boolean isEmergency = false;

    // EMERGENCY
    if (msg.contains("severe chest pain") || msg.contains("heart attack") || msg.contains("unable to breathe")) {
      department = "CARDIO";
      isEmergency = true;
      responseText = "🚨 This may be a serious condition. Please seek immediate medical attention.";
    }
    // CARDIO
    else if (msg.contains("chest pain") || msg.contains("heart") || msg.contains("pressure in chest")) {
      department = "CARDIO";
      responseText = "You may be experiencing a cardiac issue. A cardiologist is recommended.";
    }
    // NEURO
    else if (msg.contains("headache") || msg.contains("dizziness") || msg.contains("migraine")) {
      department = "NEURO";
      responseText = "This could be a neurological issue. Please consult a neurologist.";
    }
    // ORTHO
    else if (msg.contains("fracture") || msg.contains("bone pain") || msg.contains("joint pain")) {
      department = "ORTHO";
      responseText = "This appears to be an orthopedic issue. Consult an orthopedic specialist.";
    }
    // GENERAL
    else if (msg.contains("fever") || msg.contains("cold") || msg.contains("cough")) {
      responseText = "This may be a general infection. Stay hydrated and monitor your symptoms.";
    }
    else {
      responseText = "Please describe your symptoms in more detail so I can assist you better.";
    }

    Long createdCaseId = null;

    if (department != null) {
      MedicalCase mc = new MedicalCase();
      long caseId = System.currentTimeMillis();
      mc.setCaseId(caseId);
      mc.setPatientName(patientName != null && !patientName.isEmpty() ? patientName : "Patient");
      mc.setPatientId(patientId);
      mc.setSymptoms(message);
      mc.setDepartment(department);

      medicalCaseService.createCase(mc);
      createdCaseId = caseId;

      responseText += " ✅ Your case has been registered and assigned to the " + department + " department.";
    }

    if (!isEmergency && department != null) {
      responseText += " A doctor from the " + department + " team will connect with you shortly.";
    }

    ChatMessage chat = new ChatMessage();
    chat.setUserMessage(message);
    chat.setBotResponse(responseText);
    chat.setTimestamp(LocalDateTime.now());
    chatRepository.save(chat);

    return new ChatResponse(responseText, createdCaseId, department);
  }

  public String getResponse(String message) {
    return getChatResponse(message, "Patient", null).getMessage();
  }
}

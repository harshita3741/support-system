package com.supportsystem.majorproject.service;

import com.supportsystem.majorproject.model.entity.ChatMessage;
import com.supportsystem.majorproject.model.MedicalCase;
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

        String response;
        String msg = message.toLowerCase();

        String department = null;
        boolean isSevere = false;

        // 🔍 Detect symptoms → department
        if (msg.contains("chest pain") || msg.contains("heart")) {
            department = "CARDIO";
            isSevere = true;
            response = "Possible heart-related issue. Creating an urgent case for cardiology.";
        }
        else if (msg.contains("headache") || msg.contains("brain")) {
            department = "NEURO";
            response = "This may be neurological. Creating a case for neuro department.";
        }
        else if (msg.contains("bone") || msg.contains("fracture")) {
            department = "ORTHO";
            response = "This may be an orthopedic issue. Creating a case.";
        }
        else if (msg.contains("fever")) {
            response = "It may be an infection. Monitor symptoms.";
        }
        else {
            response = "Please provide more details.";
        }

        // 🚀 If department detected → create case
        if (department != null) {

            MedicalCase medicalCase = new MedicalCase();
            medicalCase.setCaseId(System.currentTimeMillis()); // simple unique ID
            medicalCase.setPatientName("ChatUser");
            medicalCase.setSymptoms(message);
            medicalCase.setDepartment(department);

            medicalCaseService.createCase(medicalCase);

            response += " Your case has been registered.";
        }

        // 💾 Save chat
        ChatMessage chat = new ChatMessage();
        chat.setUserMessage(message);
        chat.setBotResponse(response);
        chat.setTimestamp(LocalDateTime.now());

        chatRepository.save(chat);

        return response;
    }
}
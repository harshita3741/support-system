package com.supportsystem.majorproject.controller;

import com.supportsystem.majorproject.model.dto.ChatResponse;
import com.supportsystem.majorproject.service.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/chat")
@CrossOrigin(origins = "*")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping
    public ResponseEntity<ChatResponse> chat(@RequestBody Map<String, String> body) {
        String message     = body.getOrDefault("message", "");
        String patientName = body.getOrDefault("patientName", "Patient");
        String patientId   = body.getOrDefault("patientId", "");

        if (message.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        ChatResponse response = chatService.getChatResponse(message, patientName, patientId);
        return ResponseEntity.ok(response);
    }
}

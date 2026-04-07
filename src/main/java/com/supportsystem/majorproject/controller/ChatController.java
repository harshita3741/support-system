package com.supportsystem.majorproject.controller;

import com.supportsystem.majorproject.model.dto.ChatRequest;
import com.supportsystem.majorproject.service.ChatService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/chat")
@CrossOrigin(origins = "*")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping
    public String chat(@RequestBody ChatRequest request) {
        return chatService.getResponse(request.getMessage());
    }
}
package com.supportsystem.majorproject.controller;

import com.supportsystem.majorproject.model.dto.ChatRequest;
import com.supportsystem.majorproject.model.dto.ChatResponse;
import com.supportsystem.majorproject.service.ChatService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/chat")
@CrossOrigin("*")
public class ChatController {

  private final ChatService chatService;

  public ChatController(ChatService chatService) {
    this.chatService = chatService;
  }

  @PostMapping
  public ChatResponse chat(@RequestBody ChatRequest request) {
    return chatService.getChatResponse(
      request.getMessage(),
      request.getPatientName(),
      request.getPatientId()
    );
  }
}

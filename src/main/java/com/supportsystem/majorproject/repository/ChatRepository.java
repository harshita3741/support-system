package com.supportsystem.majorproject.repository;

import com.supportsystem.majorproject.model.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatRepository extends JpaRepository<ChatMessage, Long> {
}

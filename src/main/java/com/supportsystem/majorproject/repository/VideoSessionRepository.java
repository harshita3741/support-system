package com.supportsystem.majorproject.repository;

import com.supportsystem.majorproject.model.VideoSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VideoSessionRepository extends JpaRepository<VideoSession, Long> {}

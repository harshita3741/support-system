package com.supportsystem.majorproject.repository;

import com.supportsystem.majorproject.model.VideoSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface VideoSessionRepository extends JpaRepository<VideoSession, Long> {

  /** Atomic upsert for offer — creates row if missing, updates offer_sdp if exists */
  @Modifying
  @Transactional
  @Query(value =
    "MERGE INTO video_sessions WITH (HOLDLOCK) AS t " +
    "USING (VALUES (:caseId)) AS s(case_id) ON t.case_id = s.case_id " +
    "WHEN MATCHED THEN UPDATE SET t.offer_sdp = :sdp, t.status = 'OFFERED' " +
    "WHEN NOT MATCHED THEN INSERT (case_id, offer_sdp, status, patient_candidates, doctor_candidates) " +
    "VALUES (:caseId, :sdp, 'OFFERED', '[]', '[]');",
    nativeQuery = true)
  void upsertOffer(@Param("caseId") Long caseId, @Param("sdp") String sdp);

  /** Atomic upsert for answer */
  @Modifying
  @Transactional
  @Query(value =
    "MERGE INTO video_sessions WITH (HOLDLOCK) AS t " +
    "USING (VALUES (:caseId)) AS s(case_id) ON t.case_id = s.case_id " +
    "WHEN MATCHED THEN UPDATE SET t.answer_sdp = :sdp, t.status = 'ANSWERED' " +
    "WHEN NOT MATCHED THEN INSERT (case_id, answer_sdp, status, patient_candidates, doctor_candidates) " +
    "VALUES (:caseId, :sdp, 'ANSWERED', '[]', '[]');",
    nativeQuery = true)
  void upsertAnswer(@Param("caseId") Long caseId, @Param("sdp") String sdp);

  /** Atomic append to patient_candidates JSON array */
  @Modifying
  @Transactional
  @Query(value =
    "MERGE INTO video_sessions WITH (HOLDLOCK) AS t " +
    "USING (VALUES (:caseId)) AS s(case_id) ON t.case_id = s.case_id " +
    "WHEN MATCHED THEN UPDATE SET t.patient_candidates = " +
    "  CASE WHEN t.patient_candidates IS NULL OR t.patient_candidates = '[]' " +
    "       THEN '[' + :candidate + ']' " +
    "       ELSE LEFT(t.patient_candidates, LEN(t.patient_candidates)-1) + ',' + :candidate + ']' END " +
    "WHEN NOT MATCHED THEN INSERT (case_id, status, patient_candidates, doctor_candidates) " +
    "VALUES (:caseId, 'OPEN', '[' + :candidate + ']', '[]');",
    nativeQuery = true)
  void appendPatientCandidate(@Param("caseId") Long caseId, @Param("candidate") String candidate);

  /** Atomic append to doctor_candidates JSON array */
  @Modifying
  @Transactional
  @Query(value =
    "MERGE INTO video_sessions WITH (HOLDLOCK) AS t " +
    "USING (VALUES (:caseId)) AS s(case_id) ON t.case_id = s.case_id " +
    "WHEN MATCHED THEN UPDATE SET t.doctor_candidates = " +
    "  CASE WHEN t.doctor_candidates IS NULL OR t.doctor_candidates = '[]' " +
    "       THEN '[' + :candidate + ']' " +
    "       ELSE LEFT(t.doctor_candidates, LEN(t.doctor_candidates)-1) + ',' + :candidate + ']' END " +
    "WHEN NOT MATCHED THEN INSERT (case_id, status, patient_candidates, doctor_candidates) " +
    "VALUES (:caseId, 'OPEN', '[]', '[' + :candidate + ']');",
    nativeQuery = true)
  void appendDoctorCandidate(@Param("caseId") Long caseId, @Param("candidate") String candidate);
}

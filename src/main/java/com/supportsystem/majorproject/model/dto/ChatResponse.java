package com.supportsystem.majorproject.model.dto;

public class ChatResponse {

    private String message;
    private Long caseId;
    private String department;
    private boolean awaitingConsultationType;
    private String pendingSymptoms;

    public ChatResponse(String message, Long caseId, String department) {
        this.message = message;
        this.caseId = caseId;
        this.department = department;
    }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Long getCaseId() { return caseId; }
    public void setCaseId(Long caseId) { this.caseId = caseId; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public boolean isAwaitingConsultationType() { return awaitingConsultationType; }
    public void setAwaitingConsultationType(boolean awaitingConsultationType) {
        this.awaitingConsultationType = awaitingConsultationType;
    }

    public String getPendingSymptoms() { return pendingSymptoms; }
    public void setPendingSymptoms(String pendingSymptoms) { this.pendingSymptoms = pendingSymptoms; }
}

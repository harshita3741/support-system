import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { AuthService } from "../../core/auth";

interface Message {
  text: string;
  sender: "user" | "bot";
  time: string;
  caseBadge?: string;
  showVideoCallPending?: boolean;
  showVideoCall?: boolean;
  showChatConsultation?: boolean;   // chat consultation accepted/active
  showConsultationChoice?: boolean;  // show Video/Chat choice buttons
  showSymptomsPrompt?: boolean;      // prompt user to fill symptoms first
  showQuickDetails?: boolean;        // show quick-add-details prompt
  quickDetailsCaseId?: string;       // caseId for quick-details submission
  doctorName?: string;
  caseId?: string;
  department?: string;
  pendingSymptoms?: string;
}

@Component({
  selector: "app-chatbot",
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: "./chatbot.html",
  styleUrls: ["./chatbot.css"]
})
export class ChatbotComponent implements OnInit, OnDestroy {
  messages: Message[] = [
    { text: "Hello! I am your CareAI health assistant. Describe your symptoms and I will help you.", sender: "bot", time: this.getTime() }
  ];
  userInput = "";
  isTyping = false;
  initials = "";
  patientName = "";
  patientId = "";
  showAvatarMenu = false;
  suggestions = ["I have a headache", "Chest pain", "I have fever", "Bone fracture"];
  private pollingIntervals: Map<string, any> = new Map();

  // ─── Quick-add details state (keyed by caseId) ────────────────
  quickDetailsState: Record<string, {
    open: boolean;
    submitted: boolean;
    duration: string;
    severity: string;
    notes: string;
  }> = {};

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.initials = this.auth.getInitials();
    this.patientName = this.auth.getPatientName();
    this.patientId = localStorage.getItem("patientId") || "";
  }

  ngOnDestroy() {
    this.pollingIntervals.forEach(interval => clearInterval(interval));
  }

  getTime(): string {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  sendSuggestion(text: string) {
    if (this.isTyping) return;
    this.userInput = text;
    this.send();
  }

  toggleAvatarMenu() { this.showAvatarMenu = !this.showAvatarMenu; }
  closeMenus() { this.showAvatarMenu = false; }
  logout() { localStorage.clear(); this.router.navigate(["/"]); }
  onEnter(event: any) { if (event.key === "Enter") this.send(); }

  joinVideoCall(caseId: string) {
    this.router.navigate(["/video-call"], { queryParams: { caseId } });
  }

  joinChatConsultation(caseId: string) {
    this.router.navigate(["/chat-consultation"], { queryParams: { caseId } });
  }

  // ─── Consultation type choice ─────────────────────────────────

  chooseConsultationType(msgIndex: number, type: "VIDEO" | "CHAT") {
    const msg = this.messages[msgIndex];
    if (!msg) return;

    const department = msg.department || "GENERAL";
    const symptoms = msg.pendingSymptoms || "";

    this.http.post<any>("http://localhost:8080/cases/create-with-type", {
      patientName: this.patientName || "Patient",
      symptoms,
      department,
      consultationType: type
    }).subscribe({
      next: (res: any) => {
        const caseId = String(res.caseId || "");
        this.ngZone.run(() => {
          // Hide the choice buttons on that message
          const updated = [...this.messages];
          updated[msgIndex] = { ...updated[msgIndex], showConsultationChoice: false };

          const deptLabel = this.getDeptLabel(department);

          if (type === "VIDEO") {
            // Show pending badge and poll for doctor acceptance
            const newIdx = updated.length;
            updated.push({
              text: `✅ Video call request sent to ${deptLabel}. Waiting for a doctor to accept...`,
              sender: "bot",
              time: this.getTime(),
              caseBadge: `Case created — ${department} dept`,
              showVideoCallPending: true,
              showVideoCall: false,
              showQuickDetails: true,
              quickDetailsCaseId: caseId,
              doctorName: deptLabel,
              caseId
            });
            this.messages = updated;
            this.cdr.detectChanges();
            this.pollForApproval(newIdx, caseId);
          } else {
            // CHAT — show "Join Chat" button, wait for doctor to accept before entering
            const newIdx = updated.length;
            updated.push({
              text: `✅ Chat consultation request sent to ${deptLabel}. Waiting for a doctor to accept...`,
              sender: "bot",
              time: this.getTime(),
              caseBadge: `Chat Case — ${department} dept`,
              showVideoCallPending: true,
              showChatConsultation: false,
              showQuickDetails: true,
              quickDetailsCaseId: caseId,
              caseId
            });
            this.messages = updated;
            this.cdr.detectChanges();
            this.pollForChatApproval(newIdx, caseId);
          }
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.messages = [...this.messages, {
            text: "Sorry, could not create your case. Please try again.",
            sender: "bot",
            time: this.getTime()
          }];
          this.cdr.detectChanges();
        });
      }
    });
  }

  getDeptLabel(department: string): string {
    const map: Record<string, string> = {
      CARDIO: "Cardiologist",
      NEURO:  "Neurologist",
      ORTHO:  "Orthopedic Specialist",
      GENERAL: "General Physician"
    };
    return map[department] || department;
  }

  // ─── Poll for video call acceptance ──────────────────────────

  pollForApproval(msgIndex: number, caseId: string) {
    const interval = setInterval(() => {
      this.http.get<any>(`http://localhost:8080/cases/${caseId}/status`).subscribe({
        next: (res) => {
          let parsed: any = res;
          if (typeof res === "string") {
            try { parsed = JSON.parse(res); } catch { parsed = {}; }
          }
          const status = (parsed.status || "").toUpperCase();

          if (status === "ACCEPTED") {
            clearInterval(interval);
            this.pollingIntervals.delete(caseId);
            this.ngZone.run(() => {
              const updated = [...this.messages];
              updated[msgIndex] = {
                ...updated[msgIndex],
                showVideoCall: true,
                showVideoCallPending: false
              };
              this.messages = updated;
              this.cdr.detectChanges();
            });
          } else if (status === "DECLINED") {
            clearInterval(interval);
            this.pollingIntervals.delete(caseId);
            this.ngZone.run(() => {
              const updated = [...this.messages];
              updated[msgIndex] = {
                ...updated[msgIndex],
                showVideoCallPending: false,
                showVideoCall: false,
                text: updated[msgIndex].text + "\n\n⚠️ No doctors are available in this department right now. Please try again later or describe different symptoms.",
                caseBadge: "Request Declined"
              };
              this.messages = updated;
              this.cdr.detectChanges();
            });
          }
        },
        error: () => {}
      });
    }, 4000);
    this.pollingIntervals.set(caseId, interval);
  }

  // ─── Poll for CHAT acceptance (shows Join Chat button) ───────

  pollForChatApproval(msgIndex: number, caseId: string) {
    const interval = setInterval(() => {
      this.http.get<any>(`http://localhost:8080/cases/${caseId}/status`).subscribe({
        next: (res) => {
          const status = (res?.status || "").toUpperCase();
          if (status === "ACCEPTED") {
            clearInterval(interval);
            this.pollingIntervals.delete(caseId);
            this.ngZone.run(() => {
              const updated = [...this.messages];
              updated[msgIndex] = {
                ...updated[msgIndex],
                showVideoCallPending: false,
                showChatConsultation: true,
                text: "✅ A doctor has accepted your chat request. Click below to join the chat."
              };
              this.messages = updated;
              this.cdr.detectChanges();
            });
          } else if (status === "DECLINED") {
            clearInterval(interval);
            this.pollingIntervals.delete(caseId);
            this.ngZone.run(() => {
              const updated = [...this.messages];
              updated[msgIndex] = {
                ...updated[msgIndex],
                showVideoCallPending: false,
                text: updated[msgIndex].text + "\n\n⚠️ No doctors are available right now. Please try again later.",
                caseBadge: "Request Declined"
              };
              this.messages = updated;
              this.cdr.detectChanges();
            });
          }
        },
        error: () => {}
      });
    }, 4000);
    this.pollingIntervals.set(caseId, interval);
  }

  goToSymptoms() {
    this.router.navigate(["/symptoms"]);
  }

  // ─── Quick details helpers ────────────────────────────────────

  initQuickDetails(caseId: string) {
    if (!this.quickDetailsState[caseId]) {
      this.quickDetailsState[caseId] = { open: false, submitted: false, duration: '', severity: '', notes: '' };
    }
  }

  getQD(caseId: string) {
    this.initQuickDetails(caseId);
    return this.quickDetailsState[caseId];
  }

  openQuickDetails(caseId: string) {
    this.initQuickDetails(caseId);
    this.quickDetailsState[caseId].open = true;
    this.cdr.detectChanges();
  }

  submitQuickDetails(caseId: string) {
    const qd = this.quickDetailsState[caseId];
    if (!qd) return;
    if (!qd.duration && !qd.severity && !qd.notes) {
      alert('Please fill in at least one field.');
      return;
    }

    const payload = { duration: qd.duration, severity: qd.severity, notes: qd.notes };

    this.http.patch(`http://localhost:8080/cases/${caseId}/add-details`, payload).subscribe({
      error: () => {} // best-effort; still show confirmation
    });

    // Mark submitted and close form
    this.ngZone.run(() => {
      this.quickDetailsState[caseId] = { ...qd, open: false, submitted: true };

      const parts = [];
      if (qd.duration) parts.push(`• Duration: ${qd.duration}`);
      if (qd.severity) parts.push(`• Severity: ${qd.severity}`);
      if (qd.notes)    parts.push(`• Notes: ${qd.notes}`);

      this.messages = [...this.messages, {
        text: `📋 Details added:\n${parts.join('\n')}`,
        sender: "bot",
        time: this.getTime()
      }];
      this.cdr.detectChanges();
    });
  }

  /** Returns true if the user is explicitly asking to talk to a doctor
   *  WITHOUT describing any medical symptoms (so we can ask them to fill symptoms first). */
  private isDoctorConnectIntent(text: string): boolean {
    const connectRe = /\b(connect|talk|speak|consult|see|call|get|reach|need)\s+(me\s+)?(to\s+|with\s+)?(a\s+|the\s+)?doctor\b/i;
    const doctorDirectRe = /\bdoctor\s+(please|now|help|asap|immediately)\b/i;
    const hasSymptoms = /\b(pain|ache|fever|sick|hurt|cough|cold|head|chest|stomach|vomit|nausea|dizzy|bleed|rash|swelling|fatigue|tired|breath|pressure|sugar|anxiety|stress|injury|fracture|wound|symptom|feel\s+bad|feel\s+ill|not\s+well)\b/i;
    const mentionsDoctor = connectRe.test(text) || doctorDirectRe.test(text);
    const hasHealthContext = hasSymptoms.test(text);
    return mentionsDoctor && !hasHealthContext;
  }

  // ─── Send message to chatbot ──────────────────────────────────

  send() {
    const text = this.userInput.trim();
    if (!text || this.isTyping) return;

    this.messages = [...this.messages, { text, sender: "user", time: this.getTime() }];
    this.userInput = "";
    this.isTyping = true;

    // If user just wants to "connect to doctor" without any symptoms, prompt symptoms first
    if (this.isDoctorConnectIntent(text)) {
      this.isTyping = false;
      setTimeout(() => {
        this.ngZone.run(() => {
          this.messages = [...this.messages, {
            text: "To connect you with the right doctor, I need to know your symptoms first so the doctor is prepared when they join. Please fill in your symptoms — it only takes a moment.",
            sender: "bot",
            time: this.getTime(),
            showSymptomsPrompt: true
          }];
          this.cdr.detectChanges();
        });
      }, 600);
      return;
    }

    const payload = {
      message: text,
      patientId: this.patientId,
      patientName: this.patientName || "Patient"
    };

    this.http.post<any>("http://localhost:8080/chat", payload).subscribe({
      next: (res: any) => {
        this.ngZone.run(() => {
          this.isTyping = false;

          let parsed: any = res;
          if (typeof res === "string") {
            try { parsed = JSON.parse(res); } catch { parsed = { message: res }; }
          }

          const responseText = parsed.message || parsed.text || String(res);
          const caseId       = parsed.caseId   ? String(parsed.caseId) : "";
          const department   = parsed.department || "";
          const awaitingConsultationType = !!parsed.awaitingConsultationType;
          const pendingSymptoms = parsed.pendingSymptoms || text;

          const msgIndex = this.messages.length;

          if (awaitingConsultationType && department) {
            // Ask patient how they want to consult
            this.messages = [...this.messages, {
              text: responseText,
              sender: "bot",
              time: this.getTime(),
              showConsultationChoice: true,
              department,
              pendingSymptoms
            }];
          } else if (caseId) {
            // Emergency auto-created video case
            const deptLabel = this.getDeptLabel(department);
            this.messages = [...this.messages, {
              text: responseText,
              sender: "bot",
              time: this.getTime(),
              caseBadge: department ? `Case created — ${department} dept` : "",
              showVideoCallPending: true,
              showVideoCall: false,
              doctorName: deptLabel,
              caseId
            }];
            this.pollForApproval(msgIndex, caseId);
          } else {
            this.messages = [...this.messages, {
              text: responseText,
              sender: "bot",
              time: this.getTime()
            }];
          }

          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.isTyping = false;
          this.messages = [...this.messages, {
            text: "Sorry, could not connect to the server. Please try again.",
            sender: "bot",
            time: this.getTime()
          }];
          this.cdr.detectChanges();
        });
      }
    });
  }
}

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
  doctorName?: string;
  caseId?: string;
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
  logout() { localStorage.clear(); this.router.navigate(["/login"]); }
  onEnter(event: any) { if (event.key === "Enter") this.send(); }

  joinVideoCall(caseId: string) {
    this.router.navigate(["/video-call"], { queryParams: { caseId } });
  }

  pollForApproval(msgIndex: number, caseId: string) {
    const interval = setInterval(() => {
      this.http.get<any>(`http://localhost:8080/cases/${caseId}/status`).subscribe({
        next: (res) => {
          // Parse whether object or JSON string
          let parsed: any = res;
          if (typeof res === 'string') {
            try { parsed = JSON.parse(res); } catch { parsed = {}; }
          }
          const status = (parsed.status || '').toUpperCase();
          if (status === "ACCEPTED") {
            clearInterval(interval);
            this.pollingIntervals.delete(caseId);
            this.ngZone.run(() => {
              const updated = [...this.messages];
              updated[msgIndex] = { ...updated[msgIndex], showVideoCall: true, showVideoCallPending: false };
              this.messages = updated;
              this.cdr.detectChanges();
            });
          }
        },
        error: () => {}
      });
    }, 5000);
    this.pollingIntervals.set(caseId, interval);
  }

  send() {
    const text = this.userInput.trim();
    if (!text || this.isTyping) return;

    this.messages = [...this.messages, { text, sender: "user", time: this.getTime() }];
    this.userInput = "";
    this.isTyping = true;

    const payload = {
      message: text,
      patientId: this.patientId,
      patientName: this.patientName || "Patient"
    };

    this.http.post<any>("http://localhost:8080/chat", payload).subscribe({
      next: (res: any) => {
        this.ngZone.run(() => {
          this.isTyping = false;

          // Parse response whether it comes as an object or a JSON string
          let parsed: any = res;
          if (typeof res === 'string') {
            try { parsed = JSON.parse(res); } catch { parsed = { message: res }; }
          }

          const responseText = parsed.message || parsed.text || String(res);
          const caseId = parsed.caseId ? String(parsed.caseId) : "";
          const department = parsed.department || "";

          let badge = "";
          let showVideoCallPending = false;
          let doctorName = "";

          if (department === "CARDIO" || responseText.toLowerCase().includes("cardio")) {
            badge = "Case created — CARDIO dept";
            showVideoCallPending = !!caseId;
            doctorName = "Cardiologist";
          } else if (department === "NEURO" || responseText.toLowerCase().includes("neuro")) {
            badge = "Case created — NEURO dept";
            showVideoCallPending = !!caseId;
            doctorName = "Neurologist";
          } else if (department === "ORTHO" || responseText.toLowerCase().includes("ortho")) {
            badge = "Case created — ORTHO dept";
            showVideoCallPending = !!caseId;
            doctorName = "Orthopedic Specialist";
          }

          const msgIndex = this.messages.length;
          this.messages = [...this.messages, {
            text: responseText,
            sender: "bot",
            time: this.getTime(),
            caseBadge: badge,
            showVideoCall: false,
            showVideoCallPending,
            doctorName,
            caseId
          }];
          this.cdr.detectChanges();

          if (showVideoCallPending && caseId) {
            this.pollForApproval(msgIndex, caseId);
          }
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

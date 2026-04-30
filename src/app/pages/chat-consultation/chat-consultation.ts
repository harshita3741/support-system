import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule, Router, ActivatedRoute } from "@angular/router";
import { HttpClient } from "@angular/common/http";

@Component({
  selector: "app-chat-consultation",
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: "./chat-consultation.html",
  styleUrls: ["./chat-consultation.css"]
})
export class ChatConsultationComponent implements OnInit, OnDestroy {

  caseId = "";
  status: "waiting" | "active" | "declined" | "ended" = "waiting";
  messages: { sender: string; text: string; time: string }[] = [];
  newMessage = "";
  switchingToVideo = false;
  videoUpgradeReady = false;
  isVideoQueue = false;  // true when arriving from symptoms page with VIDEO type

  private statusPollInterval: any;
  private messagePollInterval: any;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.caseId = params["caseId"] || "";
      if (!this.caseId) {
        this.router.navigate(["/chatbot"]);
        return;
      }
      this.isVideoQueue = (params["type"] || "").toUpperCase() === "VIDEO";
      this.pollCaseStatus();
    });
  }

  ngOnDestroy() {
    clearInterval(this.statusPollInterval);
    clearInterval(this.messagePollInterval);
  }

  pollCaseStatus() {
    this.statusPollInterval = setInterval(() => {
      this.http.get<any>(`http://localhost:8080/cases/${this.caseId}/status`).subscribe({
        next: (res) => {
          const caseStatus = (res?.status || "").toUpperCase();
          const consultationType = (res?.consultationType || "CHAT").toUpperCase();

          this.ngZone.run(() => {
            if (caseStatus === "DECLINED") {
              clearInterval(this.statusPollInterval);
              clearInterval(this.messagePollInterval);
              this.status = "declined";
              this.cdr.detectChanges();
              return;
            }

            if (caseStatus === "ENDED") {
              clearInterval(this.statusPollInterval);
              clearInterval(this.messagePollInterval);
              this.status = "ended";
              this.cdr.detectChanges();
              return;
            }

            // VIDEO queue (from symptoms page) OR doctor upgraded to video from chat
            if (consultationType === "VIDEO" && caseStatus === "ACCEPTED" && !this.videoUpgradeReady && !this.switchingToVideo) {
              clearInterval(this.statusPollInterval);
              clearInterval(this.messagePollInterval);
              this.videoUpgradeReady = true;
              this.cdr.detectChanges();
              // Send browser notification
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification("Doctor switched to Video Call", {
                  body: "Click to join the video call",
                  icon: "/favicon.ico"
                });
              }
              return;
            }

            // Doctor accepted chat — activate chat mode (only once)
            if ((caseStatus === "ACCEPTED") && this.status === "waiting") {
              this.status = "active";
              this.cdr.detectChanges();
              this.startMessagePolling();
              // Request notification permission
              if ("Notification" in window && Notification.permission === "default") {
                Notification.requestPermission();
              }
              // NOTE: we do NOT clearInterval(statusPollInterval) here
              // We keep it running to detect future video upgrades
            }
          });
        },
        error: () => {}
      });
    }, 3000);
  }

  joinVideoCall() {
    clearInterval(this.statusPollInterval);
    clearInterval(this.messagePollInterval);
    this.router.navigate(["/video-call"], { queryParams: { caseId: this.caseId } });
  }

  startMessagePolling() {
    clearInterval(this.messagePollInterval);
    this.messagePollInterval = setInterval(() => {
      this.http.get(`http://localhost:8080/video-sessions/${this.caseId}/messages`,
        { responseType: "text" }
      ).subscribe({
        next: (raw: string) => {
          try {
            const incoming: any[] = JSON.parse(raw);
            this.ngZone.run(() => {
              if (incoming.length !== this.messages.length) {
                const newMsgs = incoming.slice(this.messages.length);
                this.messages = incoming;
                // Notification for new doctor messages
                const doctorMsgs = newMsgs.filter(m => m.sender === "doctor");
                if (doctorMsgs.length > 0 && "Notification" in window && Notification.permission === "granted") {
                  new Notification("New message from doctor", {
                    body: doctorMsgs[doctorMsgs.length - 1].text,
                    icon: "/favicon.ico"
                  });
                }
                this.cdr.detectChanges();
              }
            });
          } catch (_) {}
        },
        error: () => {}
      });
    }, 2000);
  }

  sendMessage() {
    const text = this.newMessage.trim();
    if (!text || this.status !== "active") return;
    this.newMessage = "";
    this.http.post(`http://localhost:8080/video-sessions/${this.caseId}/messages`,
      { sender: "patient", text }
    ).subscribe({ error: () => {} });
  }

  switchToVideo() {
    if (this.switchingToVideo) return;
    this.switchingToVideo = true;
    this.cdr.detectChanges();
    this.http.patch(`http://localhost:8080/cases/${this.caseId}/upgrade-to-video`, {}).subscribe({
      next: () => {
        clearInterval(this.statusPollInterval);
        clearInterval(this.messagePollInterval);
        this.router.navigate(["/video-call"], { queryParams: { caseId: this.caseId } });
      },
      error: () => {
        this.ngZone.run(() => { this.switchingToVideo = false; this.cdr.detectChanges(); });
      }
    });
  }

  formatTime(iso: string): string {
    try {
      const d = new Date(iso);
      return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
    } catch { return ""; }
  }

  endConsultation() {
    this.http.patch(`http://localhost:8080/cases/${this.caseId}/end`, {}).subscribe({ error: () => {} });
    clearInterval(this.statusPollInterval);
    clearInterval(this.messagePollInterval);
    sessionStorage.removeItem('chatbot_messages');
    this.ngZone.run(() => { this.status = "ended"; this.cdr.detectChanges(); });
    setTimeout(() => this.router.navigate(["/chatbot"]), 2000);
  }
}

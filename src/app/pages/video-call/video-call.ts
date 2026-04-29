import { Component, OnInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef, NgZone } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule, Router, ActivatedRoute } from "@angular/router";
import { HttpClient } from "@angular/common/http";

const STUN_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" }
  ]
};

@Component({
  selector: "app-video-call",
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: "./video-call.html",
  styleUrls: ["./video-call.css"]
})
export class VideoCallComponent implements OnInit, OnDestroy {

  @ViewChild("localVideo") localVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild("remoteVideo") remoteVideoRef!: ElementRef<HTMLVideoElement>;

  caseId = "";

  // Consultation mode
  consultationType: "CHAT" | "VIDEO" | "unknown" = "unknown";
  chatMode = false;           // currently showing chat UI
  chatConnected = false;      // doctor accepted, chat is live
  videoUpgradeReady = false;  // doctor switched to video — show patient notification
  isSwitchingToVideo = false; // patient is initiating video switch

  callStatus: "loading" | "waiting" | "connecting" | "connected" | "ended" | "doctor-ended" | "declined" | "error" = "loading";
  callDuration = 0;
  isMuted = false;
  isVideoOff = false;
  isRemoteVideoOff = false;
  statusMessage = "Connecting...";
  endReason = "";

  // Chat
  chatOpen = false;
  newMessage = "";
  messages: { sender: string; text: string; time: string }[] = [];
  unreadCount = 0;

  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private timerStartedAt = 0;
  private timer: any;
  private answerPollInterval: any;
  private candidatePollInterval: any;
  private statusPollInterval: any;
  private messagePollInterval: any;
  private lastDoctorCandidateIdx = 0;  // tracks already-added doctor ICE candidates

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
        this.callStatus = "error";
        this.statusMessage = "No case ID provided.";
        this.cdr.detectChanges();
        return;
      }
      this.requestNotificationPermission();
      this.initCall();
    });
  }

  ngOnDestroy() {
    this.cleanup();
  }

  requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  sendNotification(title: string, body: string) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/favicon.ico" });
    }
  }

  // ── Initialise: detect consultation type ─────────────────────

  initCall() {
    this.statusMessage = "Connecting...";
    this.cdr.detectChanges();

    this.http.get<any>(`http://localhost:8080/cases/${this.caseId}/status`).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          const ct = (res?.consultationType || "VIDEO").toUpperCase();
          this.consultationType = ct as "CHAT" | "VIDEO";
          if (ct === "CHAT") {
            this.startChatMode();
          } else {
            this.startVideoMode();
          }
          this.cdr.detectChanges();
        });
      },
      error: () => {
        // Default to video if we can't determine type
        this.ngZone.run(() => {
          this.consultationType = "VIDEO";
          this.startVideoMode();
        });
      }
    });
  }

  // ── CHAT MODE ─────────────────────────────────────────────────

  startChatMode() {
    this.chatMode = true;
    this.chatConnected = true;
    this.callStatus = "connected";
    this.chatOpen = true;
    this.cdr.detectChanges();

    this.startMessagePolling();
    // Poll for doctor upgrading to video
    this.pollForVideoUpgrade();

    this.sendNotification("Connected to doctor", "Your chat consultation has started.");
  }

  pollForVideoUpgrade() {
    this.statusPollInterval = setInterval(() => {
      this.http.get<any>(`http://localhost:8080/cases/${this.caseId}/status`).subscribe({
        next: (res) => {
          const ct = (res?.consultationType || "VIDEO").toUpperCase();
          const status = (res?.status || "").toUpperCase();

          if (ct === "VIDEO" && this.consultationType === "CHAT" && !this.videoUpgradeReady && !this.isSwitchingToVideo) {
            clearInterval(this.statusPollInterval);
            this.ngZone.run(() => {
              this.videoUpgradeReady = true;
              this.cdr.detectChanges();
              this.sendNotification("Doctor switched to video call", "Click Join Video Call to connect.");
            });
          }

          if (status === "ENDED") {
            clearInterval(this.statusPollInterval);
            this.ngZone.run(() => { this.handleDoctorEnded(); });
          }
        },
        error: () => {}
      });
    }, 3000);
  }

  /** Patient decides to upgrade from chat to video */
  patientSwitchToVideo() {
    if (this.isSwitchingToVideo) return;
    this.isSwitchingToVideo = true;
    this.cdr.detectChanges();

    // Patch the case so doctor gets notified
    this.http.patch(`http://localhost:8080/cases/${this.caseId}/upgrade-to-video`, {}).subscribe({
      next: () => {
        // Start video — patient creates the offer
        this.ngZone.run(() => {
          this.chatMode = false;
          this.consultationType = "VIDEO";
          this.isSwitchingToVideo = false;
          clearInterval(this.statusPollInterval);
          clearInterval(this.messagePollInterval);
          this.startVideoMode();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.isSwitchingToVideo = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  /** Doctor switched to video — patient clicks Join */
  joinVideoFromChat() {
    this.videoUpgradeReady = false;
    this.chatMode = false;
    this.consultationType = "VIDEO";
    clearInterval(this.statusPollInterval);
    clearInterval(this.messagePollInterval);
    this.cdr.detectChanges();
    this.startVideoMode();
  }

  // ── VIDEO MODE ────────────────────────────────────────────────

  async startVideoMode() {
    this.callStatus = "loading";
    this.statusMessage = "Accessing camera and microphone...";
    this.cdr.detectChanges();

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      setTimeout(() => {
        if (this.localVideoRef?.nativeElement) {
          this.localVideoRef.nativeElement.srcObject = this.localStream;
        }
      }, 100);

      this.pc = new RTCPeerConnection(STUN_SERVERS);
      this.localStream.getTracks().forEach(track => this.pc!.addTrack(track, this.localStream!));

      this.pc.ontrack = (event) => {
        if (event.streams?.[0]) {
          this.remoteStream = event.streams[0];
          event.streams[0].getVideoTracks().forEach(track => {
            track.onmute = () => this.ngZone.run(() => { this.isRemoteVideoOff = true; this.cdr.detectChanges(); });
            track.onunmute = () => this.ngZone.run(() => { this.isRemoteVideoOff = false; this.cdr.detectChanges(); });
            track.onended = () => this.ngZone.run(() => { this.handleDoctorEnded(); });
          });
        }
        this.ngZone.run(() => this.attachRemoteStream());
      };

      this.pc.onconnectionstatechange = () => {
        const state = this.pc?.connectionState;
        if (state === "connected") {
          this.ngZone.run(() => {
            setTimeout(() => {
              if (!this.remoteStream && this.pc) {
                const tracks = this.pc.getReceivers().map(r => r.track).filter(t => t);
                if (tracks.length) this.remoteStream = new MediaStream(tracks);
              }
              this.attachRemoteStream();
            }, 300);
          });
        }
        if (state === "disconnected" || state === "failed" || state === "closed") {
          this.ngZone.run(() => { this.handleDoctorEnded(); });
        }
      };

      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.http.post(`http://localhost:8080/video-sessions/${this.caseId}/candidate/patient`,
            { candidate: JSON.stringify(event.candidate) }
          ).subscribe({ error: () => {} });
        }
      };

      this.statusMessage = "Creating connection offer...";
      this.cdr.detectChanges();

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      this.http.post(`http://localhost:8080/video-sessions/${this.caseId}/offer`,
        { sdp: JSON.stringify(offer) }
      ).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.callStatus = "waiting";
            this.statusMessage = "Waiting for doctor to join...";
            this.cdr.detectChanges();
            this.pollForAnswer();
            this.pollCaseStatus();
            this.startMessagePolling(); // Start chat polling immediately (don't wait for video to connect)
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.callStatus = "error";
            this.statusMessage = "Failed to reach server.";
            this.cdr.detectChanges();
          });
        }
      });

    } catch (err: any) {
      this.ngZone.run(() => {
        this.callStatus = "error";
        this.statusMessage = err.name === "NotAllowedError"
          ? "Camera/microphone access denied. Please allow access and try again."
          : "Could not start video call: " + (err.message || "Unknown error");
        this.cdr.detectChanges();
      });
    }
  }

  // ── Poll case status (video mode: detect DECLINED, ENDED) ─────

  pollCaseStatus() {
    this.statusPollInterval = setInterval(() => {
      this.http.get<any>(`http://localhost:8080/cases/${this.caseId}/status`).subscribe({
        next: (res) => {
          const status = (res?.status || "").toUpperCase();
          if (status === "DECLINED") {
            clearInterval(this.statusPollInterval);
            clearInterval(this.answerPollInterval);
            this.ngZone.run(() => {
              this.callStatus = "declined";
              this.cdr.detectChanges();
            });
          } else if (status === "ENDED") {
            clearInterval(this.statusPollInterval);
            this.ngZone.run(() => { this.handleDoctorEnded(); });
          }
        },
        error: () => {}
      });
    }, 4000);
  }

  handleDoctorEnded() {
    if (this.callStatus === "doctor-ended" || this.callStatus === "ended") return;
    this.cleanup();
    this.callStatus = "doctor-ended";
    this.chatMode = false;
    this.cdr.detectChanges();
  }

  // ── WebRTC signaling ──────────────────────────────────────────

  pollForAnswer() {
    this.answerPollInterval = setInterval(async () => {
      this.http.get<any>(`http://localhost:8080/video-sessions/${this.caseId}/answer`).subscribe({
        next: async (res) => {
          if (res?.sdp && this.pc) {
            clearInterval(this.answerPollInterval);
            clearInterval(this.statusPollInterval);
            try {
              const answer = JSON.parse(res.sdp);
              await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
              this.ngZone.run(() => {
                this.callStatus = "connecting";
                this.statusMessage = "Doctor connected. Establishing stream...";
                this.cdr.detectChanges();
              });
              this.pollForCandidates();
              this.pollCaseStatus();
            } catch (_) {}
          }
        },
        error: () => {}
      });
    }, 3000);
  }

  pollForCandidates() {
    this.lastDoctorCandidateIdx = 0;
    this.candidatePollInterval = setInterval(() => {
      this.http.get(`http://localhost:8080/video-sessions/${this.caseId}/candidates/doctor`,
        { responseType: "text" }
      ).subscribe({
        next: async (raw: string) => {
          try {
            const candidates: any[] = JSON.parse(raw);
            // Only process candidates we haven't added yet
            const newCandidates = candidates.slice(this.lastDoctorCandidateIdx);
            this.lastDoctorCandidateIdx = candidates.length;
            for (const c of newCandidates) {
              const candidate = typeof c === "string" ? JSON.parse(c) : c;
              if (this.pc && candidate?.candidate) {
                await this.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
              }
            }
          } catch (_) {}
        },
        error: () => {}
      });
    }, 3000);
  }

  attachRemoteStream() {
    if (this.remoteVideoRef?.nativeElement && this.remoteStream) {
      this.remoteVideoRef.nativeElement.srcObject = this.remoteStream;
      this.remoteVideoRef.nativeElement.play().catch(() => {});
    }
    if (this.callStatus !== "connected") {
      this.callStatus = "connected";
      this.chatMode = false;
      this.startTimer();
      this.startMessagePolling();
      this.sendNotification("Video call connected", "You are now connected with the doctor.");
      this.cdr.detectChanges();
    }
  }

  // ── Chat ──────────────────────────────────────────────────────

  toggleChat() {
    this.chatOpen = !this.chatOpen;
    if (this.chatOpen) this.unreadCount = 0;
    this.cdr.detectChanges();
  }

  sendMessage() {
    const text = this.newMessage.trim();
    if (!text) return;
    this.newMessage = "";
    this.http.post(`http://localhost:8080/video-sessions/${this.caseId}/messages`,
      { sender: "patient", text }
    ).subscribe({ error: () => {} });
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
                const newOnes = incoming.slice(this.messages.length);
                this.messages = incoming;
                if (!this.chatOpen) {
                  const newDoctorMsgs = newOnes.filter(m => m.sender === "doctor");
                  this.unreadCount += newDoctorMsgs.length;
                  if (newDoctorMsgs.length > 0) {
                    this.sendNotification(
                      "New message from doctor",
                      newDoctorMsgs[newDoctorMsgs.length - 1].text
                    );
                  }
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

  // ── Timer ─────────────────────────────────────────────────────

  startTimer() {
    clearInterval(this.timer);
    this.timerStartedAt = Date.now();
    this.callDuration = 0;
    this.timer = setInterval(() => {
      this.ngZone.run(() => {
        this.callDuration = Math.floor((Date.now() - this.timerStartedAt) / 1000);
        this.cdr.detectChanges();
      });
    }, 1000);
  }

  getCallTime(): string {
    const m = Math.floor(this.callDuration / 60).toString().padStart(2, "0");
    const s = (this.callDuration % 60).toString().padStart(2, "0");
    return m + ":" + s;
  }

  formatTime(iso: string): string {
    try {
      const d = new Date(iso);
      return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
    } catch { return ""; }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.localStream?.getAudioTracks().forEach(t => t.enabled = !this.isMuted);
  }

  toggleVideo() {
    this.isVideoOff = !this.isVideoOff;
    this.localStream?.getVideoTracks().forEach(t => t.enabled = !this.isVideoOff);
  }

  endCall() {
    this.http.patch(`http://localhost:8080/cases/${this.caseId}/end`, {}).subscribe({ error: () => {} });
    this.cleanup();
    this.ngZone.run(() => {
      this.callStatus = "ended";
      this.chatMode = false;
      this.cdr.detectChanges();
    });
  }

  cleanup() {
    clearInterval(this.timer);
    clearInterval(this.answerPollInterval);
    clearInterval(this.candidatePollInterval);
    clearInterval(this.statusPollInterval);
    clearInterval(this.messagePollInterval);
    this.lastDoctorCandidateIdx = 0;
    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;
    this.pc?.close();
    this.pc = null;
  }
}

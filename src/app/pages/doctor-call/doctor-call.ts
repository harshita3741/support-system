import { Component, OnInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef, NgZone } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router, ActivatedRoute } from "@angular/router";
import { HttpClient } from "@angular/common/http";

const STUN_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject"
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject"
    }
  ]
};
@Component({
  selector: "app-doctor-call",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./doctor-call.html",
  styleUrls: ["./doctor-call.css"]
})
export class DoctorCallComponent implements OnInit, OnDestroy {

  @ViewChild("localVideo") localVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild("remoteVideo") remoteVideoRef!: ElementRef<HTMLVideoElement>;

  caseId = "";
  callStatus: "loading" | "connecting" | "connected" | "ended" | "error" = "loading";
  callDuration = 0;
  isMuted = false;
  isVideoOff = false;
  statusMessage = "Connecting to patient...";
  patientName = "Patient";

  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private timer: any;
  private offerPollInterval: any;
  private candidatePollInterval: any;

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
      this.loadCaseInfo();
      this.initCall();
    });
  }

  ngOnDestroy() {
    this.cleanup();
  }

  loadCaseInfo() {
    this.http.get<any>(`http://localhost:8080/cases/${this.caseId}`).subscribe({
      next: (c) => {
        this.ngZone.run(() => {
          if (c?.patientName) this.patientName = c.patientName;
          this.cdr.detectChanges();
        });
      }
    });
  }

  async initCall() {
    try {
      this.statusMessage = "Accessing camera and microphone...";
      this.cdr.detectChanges();

      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      setTimeout(() => {
        if (this.localVideoRef?.nativeElement) {
          this.localVideoRef.nativeElement.srcObject = this.localStream;
        }
      }, 100);

      this.pc = new RTCPeerConnection(STUN_SERVERS);

      this.localStream.getTracks().forEach(track => this.pc!.addTrack(track, this.localStream!));

      this.pc.ontrack = (event) => {
        this.ngZone.run(() => {
          if (this.remoteVideoRef?.nativeElement && event.streams[0]) {
            this.remoteVideoRef.nativeElement.srcObject = event.streams[0];
            this.callStatus = "connected";
            this.startTimer();
            this.cdr.detectChanges();
          }
        });
      };

      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.http.post(`http://localhost:8080/video-sessions/${this.caseId}/candidate/doctor`,
            { candidate: JSON.stringify(event.candidate) }
          ).subscribe({ error: () => {} });
        }
      };

      this.statusMessage = "Waiting for patient offer...";
      this.cdr.detectChanges();

      this.pollForOffer();

    } catch (err: any) {
      this.ngZone.run(() => {
        this.callStatus = "error";
        this.statusMessage = err.name === "NotAllowedError"
          ? "Camera/microphone access denied. Please allow access and try again."
          : "Could not start video call: " + (err.message || "");
        this.cdr.detectChanges();
      });
    }
  }

  pollForOffer() {
    this.offerPollInterval = setInterval(async () => {
      this.http.get<any>(`http://localhost:8080/video-sessions/${this.caseId}/offer`).subscribe({
        next: async (res) => {
          if (res?.sdp && this.pc) {
            clearInterval(this.offerPollInterval);
            try {
              const offer = JSON.parse(res.sdp);
              await this.pc!.setRemoteDescription(new RTCSessionDescription(offer));

              const answer = await this.pc!.createAnswer();
              await this.pc!.setLocalDescription(answer);

              this.http.post(`http://localhost:8080/video-sessions/${this.caseId}/answer`,
                { sdp: JSON.stringify(answer) }
              ).subscribe({ error: () => {} });

              this.ngZone.run(() => {
                this.callStatus = "connecting";
                this.statusMessage = "Establishing stream...";
                this.cdr.detectChanges();
              });

              this.pollForCandidates();
            } catch (_) {}
          }
        },
        error: () => {}
      });
    }, 3000);
  }

  pollForCandidates() {
    this.candidatePollInterval = setInterval(() => {
      this.http.get(`http://localhost:8080/video-sessions/${this.caseId}/candidates/patient`,
        { responseType: "text" }
      ).subscribe({
        next: async (raw: string) => {
          try {
            const candidates: any[] = JSON.parse(raw);
            for (const c of candidates) {
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

  startTimer() {
    this.timer = setInterval(() => {
      this.ngZone.run(() => { this.callDuration++; this.cdr.detectChanges(); });
    }, 1000);
  }

  getCallTime(): string {
    const m = Math.floor(this.callDuration / 60).toString().padStart(2, "0");
    const s = (this.callDuration % 60).toString().padStart(2, "0");
    return m + ":" + s;
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
    this.cleanup();
    this.ngZone.run(() => { this.callStatus = "ended"; this.cdr.detectChanges(); });
  }

  cleanup() {
    clearInterval(this.timer);
    clearInterval(this.offerPollInterval);
    clearInterval(this.candidatePollInterval);
    this.pc?.close();
    this.localStream?.getTracks().forEach(t => t.stop());
  }
}
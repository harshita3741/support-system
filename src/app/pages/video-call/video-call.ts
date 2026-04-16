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
  selector: "app-video-call",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./video-call.html",
  styleUrls: ["./video-call.css"]
})
export class VideoCallComponent implements OnInit, OnDestroy {

  @ViewChild("localVideo") localVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild("remoteVideo") remoteVideoRef!: ElementRef<HTMLVideoElement>;

  caseId = "";
  callStatus: "loading" | "waiting" | "connecting" | "connected" | "ended" | "error" = "loading";
  callDuration = 0;
  isMuted = false;
  isVideoOff = false;
  statusMessage = "Initialising camera...";

  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private timer: any;
  private answerPollInterval: any;
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
      this.initCall();
    });
  }

  ngOnDestroy() {
    this.cleanup();
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

      // Store remote stream when tracks arrive
      this.pc.ontrack = (event) => {
        if (event.streams?.[0]) {
          this.remoteStream = event.streams[0];
        }
        this.ngZone.run(() => {
          this.attachRemoteStream();
        });
      };

      // Fallback: when peer connection fully establishes, force-attach stream
      this.pc.onconnectionstatechange = () => {
        if (this.pc?.connectionState === "connected") {
          this.ngZone.run(() => {
            setTimeout(() => {
              // If ontrack didn't provide a stream, build one from receivers
              if (!this.remoteStream && this.pc) {
                const tracks = this.pc.getReceivers().map(r => r.track).filter(t => t);
                if (tracks.length) this.remoteStream = new MediaStream(tracks);
              }
              this.attachRemoteStream();
            }, 300);
          });
        }
      };

      this.pc.oniceconnectionstatechange = () => {
        console.log("[ICE]", this.pc?.iceConnectionState);
      };

      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.http.post(`http://localhost:8080/video-sessions/${this.caseId}/candidate/patient`,
            { candidate: JSON.stringify(event.candidate) }
          ).subscribe({ error: () => {} });
        }
      };

      this.statusMessage = "Creating connection...";
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

  pollForAnswer() {
    this.answerPollInterval = setInterval(async () => {
      this.http.get<any>(`http://localhost:8080/video-sessions/${this.caseId}/answer`).subscribe({
        next: async (res) => {
          if (res?.sdp && this.pc) {
            clearInterval(this.answerPollInterval);
            try {
              const answer = JSON.parse(res.sdp);
              await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
              this.ngZone.run(() => {
                this.callStatus = "connecting";
                this.statusMessage = "Doctor connected. Establishing stream...";
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
      this.http.get(`http://localhost:8080/video-sessions/${this.caseId}/candidates/doctor`,
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

  attachRemoteStream() {
    if (this.remoteVideoRef?.nativeElement && this.remoteStream) {
      this.remoteVideoRef.nativeElement.srcObject = this.remoteStream;
      this.remoteVideoRef.nativeElement.play().catch(() => {});
    }
    if (this.callStatus !== "connected") {
      this.callStatus = "connected";
      this.startTimer();
      this.cdr.detectChanges();
    }
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
    this.callStatus = 'ended';
    this.cdr.detectChanges();
    setTimeout(() => this.router.navigate(['/dashboard']), 2000);
  }

  cleanup() {
    clearInterval(this.timer);
    clearInterval(this.answerPollInterval);
    clearInterval(this.candidatePollInterval);

    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
  }
}
 
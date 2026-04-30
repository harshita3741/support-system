import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';


const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
};


@Component({
  selector: 'app-incoming-call',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './incoming-call.html',
  styleUrl: './incoming-call.css'
})
export class IncomingCall implements OnInit, OnDestroy {

  patient: any = null;
  callAccepted = false;
  callEnded = false;
  endedByPatient = false;
  endedReason = '';
  private endHandled = false;
  isRemoteVideoOff = false;   // patient camera state
  videoUpgradeReady = false;  // patient switched to video during chat

  get consultationType(): string {
    return (this.patient?.consultationType || 'VIDEO').toUpperCase();
  }

  get isChatConsultation(): boolean {
    return this.consultationType === 'CHAT';
  }

  webrtcStatus: 'idle' | 'waiting-offer' | 'connecting' | 'connected' | 'error' = 'idle';
  webrtcStatusMsg = '';

  micOn = true;
  cameraOn = true;
  chatOpen = false;
  prescriptionOpen = false;
  callDuration = 0;

  chatConsultationActive = false;
  switchingToVideo = false;

  localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;
  private pc: RTCPeerConnection | null = null;
  private offerPollInterval: any;
  private candidatePollInterval: any;
  private callTimer: any;
  private messagePollInterval: any;
  private lastPatientCandidateIdx = 0;  // tracks already-added patient ICE candidates
  unreadCount = 0;

  chatMessage = '';
  messages: { sender: string; text: string; time: string }[] = [];

  medicines: { name: string; dosage: string; frequency: string; duration: string }[] = [
    { name: '', dosage: '', frequency: '', duration: '' }
  ];

  prescription = {
    diagnosis: '',
    advice: '',
    investigations: '',
    followUpDate: '',
    duration: ''
  };

  private baseUrl = 'http://192.168.1.76:8080';

  @ViewChild('localVideo') localVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideoRef!: ElementRef<HTMLVideoElement>;

  constructor(
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    const data = localStorage.getItem('activePatient');
    if (data) {
      this.patient = JSON.parse(data);
    }
  }

  ngOnDestroy() {
    this.cleanup();
  }

  async startVideoCall() {
    this.callAccepted = true;
    this.chatConsultationActive = false;
    this.chatOpen = false;
    this.webrtcStatus = 'waiting-offer';
    this.webrtcStatusMsg = 'Accessing camera...';
    this.cdr.detectChanges();

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      this.micOn = true;
      this.cameraOn = true;
      this.cdr.detectChanges();

      setTimeout(() => {
        if (this.localVideoRef?.nativeElement && this.localStream) {
          this.localVideoRef.nativeElement.srcObject = this.localStream;
          this.localVideoRef.nativeElement.muted = true;
          this.localVideoRef.nativeElement.playsInline = true;
          this.localVideoRef.nativeElement.play().catch(() => {});
        }
      }, 250);

      this.pc = new RTCPeerConnection(STUN_SERVERS);
      this.localStream.getTracks().forEach(track => this.pc!.addTrack(track, this.localStream!));

      this.pc.ontrack = (event) => {
        if (event.streams?.[0]) {
          this.remoteStream = event.streams[0];
          // Monitor patient video track for camera on/off
          event.streams[0].getVideoTracks().forEach(track => {
            track.onmute = () => this.ngZone.run(() => { this.isRemoteVideoOff = true; this.cdr.detectChanges(); });
            track.onunmute = () => this.ngZone.run(() => { this.isRemoteVideoOff = false; this.cdr.detectChanges(); });
          });
        }

        event.track.onended = () => {
          this.ngZone.run(() => {
            this.handleRemoteEnd('Call ended by patient');
          });
        };

        this.ngZone.run(() => {
          this.attachRemoteStream();
        });
      };

      this.pc.onconnectionstatechange = () => {
        if (!this.pc) return;

        const state = this.pc.connectionState;

        if (state === 'connected') {
          this.ngZone.run(() => {
            setTimeout(() => {
              if (!this.remoteStream && this.pc) {
                const tracks = this.pc.getReceivers()
                  .map(r => r.track)
                  .filter(Boolean) as MediaStreamTrack[];

                if (tracks.length) {
                  this.remoteStream = new MediaStream(tracks);
                }
              }
              this.attachRemoteStream();
            }, 300);
          });
        }

        if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          this.ngZone.run(() => {
            this.handleRemoteEnd('Call ended by patient');
          });
        }
      };

      this.pc.oniceconnectionstatechange = () => {
        const iceState = this.pc?.iceConnectionState;
        console.log('[ICE]', iceState);

        if (
          iceState === 'disconnected' ||
          iceState === 'failed' ||
          iceState === 'closed'
        ) {
          this.ngZone.run(() => {
            this.handleRemoteEnd('Call ended by patient');
          });
        }
      };

      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          const caseId = this.patient?.caseId;
          if (caseId) {
            this.http.post(
              `${this.baseUrl}/video-sessions/${caseId}/candidate/doctor`,
              { candidate: JSON.stringify(event.candidate) }
            ).subscribe({ error: () => {} });
          }
        }
      };

      this.webrtcStatusMsg = 'Waiting for patient to join...';
      this.cdr.detectChanges();
      this.pollForPatientOffer();

    } catch (err: any) {
      this.ngZone.run(() => {
        this.webrtcStatus = 'error';
        this.webrtcStatusMsg = err?.name === 'NotAllowedError'
          ? 'Camera/microphone access denied. Please allow access and try again.'
          : 'Could not start video: ' + (err?.message || 'Unknown error');
        this.cdr.detectChanges();
      });
    }
  }

  acceptChatConsultation() {
    const caseId = this.patient?.caseId;
    if (!caseId) return;

    const doctor = this.getDoctorSession();
    this.callAccepted = true;
    this.chatConsultationActive = true;
    this.chatOpen = true;
    this.cdr.detectChanges();

    this.http.patch(`${this.baseUrl}/cases/${caseId}/accept`, {
      doctorId: String(doctor.id || '')
    }).subscribe({ error: () => {} });

    this.startMessagePolling();
    // Poll if patient requested video upgrade
    this.pollPatientVideoUpgrade();
  }

  private patientUpgradePollInterval: any;

  pollPatientVideoUpgrade() {
    const caseId = this.patient?.caseId;
    if (!caseId) return;
    this.patientUpgradePollInterval = setInterval(() => {
      this.http.get<any>(`${this.baseUrl}/cases/${caseId}/status`).subscribe({
        next: (res) => {
          const ct = (res?.consultationType || '').toUpperCase();
          if (ct === 'VIDEO' && !this.videoUpgradeReady && !this.switchingToVideo) {
            clearInterval(this.patientUpgradePollInterval);
            this.ngZone.run(() => {
              this.videoUpgradeReady = true;
              this.cdr.detectChanges();
            });
          }
        },
        error: () => {}
      });
    }, 4000);
  }

  joinVideoCallFromChat() {
    clearInterval(this.patientUpgradePollInterval);
    clearInterval(this.messagePollInterval);
    this.videoUpgradeReady = false;
    this.chatConsultationActive = false;
    this.startVideoCall();
  }

  switchToVideo() {
    const caseId = this.patient?.caseId;
    if (!caseId || this.switchingToVideo) return;

    this.switchingToVideo = true;
    this.webrtcStatus = 'waiting-offer';
    this.webrtcStatusMsg = 'Switching to video call...';
    this.cdr.detectChanges();

    this.http.patch(`${this.baseUrl}/cases/${caseId}/upgrade-to-video`, {}).subscribe({
      next: () => {
        clearInterval(this.messagePollInterval);
        clearInterval(this.patientUpgradePollInterval);
        this.chatConsultationActive = false;
        this.chatOpen = false;
        this.switchingToVideo = false;
        this.videoUpgradeReady = false;
        this.startVideoCall();
      },
      error: () => {
        this.switchingToVideo = false;
        this.webrtcStatus = 'error';
        this.webrtcStatusMsg = 'Could not switch to video call.';
        this.cdr.detectChanges();
      }
    });
  }

  pollForPatientOffer() {
    const caseId = this.patient?.caseId;
    if (!caseId) return;

    this.offerPollInterval = setInterval(async () => {
      this.http.get<any>(`${this.baseUrl}/video-sessions/${caseId}/offer`).subscribe({
        next: async (res) => {
          if (res?.sdp && this.pc) {
            clearInterval(this.offerPollInterval);
            try {
              const offer = JSON.parse(res.sdp);
              await this.pc.setRemoteDescription(new RTCSessionDescription(offer));

              const answer = await this.pc.createAnswer();
              await this.pc.setLocalDescription(answer);

              this.http.post(
                `${this.baseUrl}/video-sessions/${caseId}/answer`,
                { sdp: JSON.stringify(answer) }
              ).subscribe({ error: () => {} });

              this.ngZone.run(() => {
                this.webrtcStatus = 'connecting';
                this.webrtcStatusMsg = 'Establishing connection...';
                this.cdr.detectChanges();
              });

              this.pollForPatientCandidates();
            } catch (e) {
              console.error('WebRTC answer error:', e);
            }
          }
        },
        error: () => {}
      });
    }, 3000);
  }

  pollForPatientCandidates() {
    const caseId = this.patient?.caseId;
    if (!caseId) return;

    this.lastPatientCandidateIdx = 0;
    this.candidatePollInterval = setInterval(() => {
      this.http.get(
        `${this.baseUrl}/video-sessions/${caseId}/candidates/patient`,
        { responseType: 'text' }
      ).subscribe({
        next: async (raw: string) => {
          try {
            const candidates: any[] = JSON.parse(raw);
            // Only process candidates we haven't added yet
            const newCandidates = candidates.slice(this.lastPatientCandidateIdx);
            this.lastPatientCandidateIdx = candidates.length;
            for (const c of newCandidates) {
              const candidate = typeof c === 'string' ? JSON.parse(c) : c;
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
      this.remoteVideoRef.nativeElement.playsInline = true;
      this.remoteVideoRef.nativeElement.play().catch(() => {});
    }

    if (this.webrtcStatus !== 'connected' && this.remoteStream) {
      this.webrtcStatus = 'connected';
      this.webrtcStatusMsg = '';
      this.startCallTimer();
      this.startMessagePolling();
      this.cdr.detectChanges();
    }
  }

  private callTimerStartedAt = 0;

  startCallTimer() {
    clearInterval(this.callTimer);
    this.callTimerStartedAt = Date.now();
    this.callDuration = 0;
    this.callTimer = setInterval(() => {
      this.ngZone.run(() => {
        this.callDuration = Math.floor((Date.now() - this.callTimerStartedAt) / 1000);
        this.cdr.detectChanges();
      });
    }, 1000);
  }

  getCallTime(): string {
    const m = Math.floor(this.callDuration / 60).toString().padStart(2, '0');
    const s = (this.callDuration % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  toggleMic() {
    if (!this.localStream) return;
    this.micOn = !this.micOn;
    this.localStream.getAudioTracks().forEach(t => t.enabled = this.micOn);
  }

  toggleCamera() {
    if (!this.localStream) return;

    this.cameraOn = !this.cameraOn;
    this.localStream.getVideoTracks().forEach(t => t.enabled = this.cameraOn);

    if (this.cameraOn) {
      setTimeout(() => {
        if (this.localVideoRef?.nativeElement) {
          this.localVideoRef.nativeElement.srcObject = this.localStream;
          this.localVideoRef.nativeElement.play().catch(() => {});
        }
      }, 50);
    }
  }

  togglePrescription() {
    this.prescriptionOpen = !this.prescriptionOpen;
    if (this.prescriptionOpen) this.chatOpen = false;
  }

  handleRemoteEnd(reason = 'Call ended by patient') {
    if (this.endHandled || this.callEnded) return;
    this.endHandled = true;

    this.endedByPatient = true;
    this.endedReason = reason;
    this.callEnded = true;
    this.callAccepted = false;
    this.chatConsultationActive = false;
    this.chatOpen = false;
    this.prescriptionOpen = false;
    this.webrtcStatus = 'idle';
    this.webrtcStatusMsg = '';

    clearInterval(this.offerPollInterval);
    clearInterval(this.candidatePollInterval);
    clearInterval(this.callTimer);
    clearInterval(this.messagePollInterval);

    if (this.remoteVideoRef?.nativeElement) {
      this.remoteVideoRef.nativeElement.pause();
      this.remoteVideoRef.nativeElement.srcObject = null;
    }

    if (this.localVideoRef?.nativeElement) {
      this.localVideoRef.nativeElement.pause();
      this.localVideoRef.nativeElement.srcObject = null;
    }

    this.remoteStream?.getTracks().forEach(t => t.stop());
    this.remoteStream = null;

    if (this.pc) {
      this.pc.ontrack = null;
      this.pc.onicecandidate = null;
      this.pc.onconnectionstatechange = null;
      this.pc.oniceconnectionstatechange = null;
      this.pc.close();
      this.pc = null;
    }

    this.stopMediaTracks();
    localStorage.removeItem('activePatient');
    this.cdr.detectChanges();

    setTimeout(() => {
      this.router.navigate(['/queue']);
    }, 2200);
  }

  endCall() {
    if (this.endHandled) return;
    this.endHandled = true;

    // Notify patient that doctor ended the call
    const caseId = this.patient?.caseId;
    if (caseId) {
      this.http.patch(`${this.baseUrl}/cases/${caseId}/end`, {}).subscribe({ error: () => {} });
    }

    this.cleanup();
    this.endedByPatient = false;
    this.endedReason = 'Consultation ended';
    this.callEnded = true;
    this.callAccepted = false;
    localStorage.removeItem('activePatient');

    setTimeout(() => {
      this.router.navigate(['/queue']);
    }, 2000);
  }

  cleanup() {
    clearInterval(this.offerPollInterval);
    clearInterval(this.candidatePollInterval);
    clearInterval(this.callTimer);
    clearInterval(this.messagePollInterval);

    if (this.remoteVideoRef?.nativeElement) {
      this.remoteVideoRef.nativeElement.pause();
      this.remoteVideoRef.nativeElement.srcObject = null;
    }

    if (this.localVideoRef?.nativeElement) {
      this.localVideoRef.nativeElement.pause();
      this.localVideoRef.nativeElement.srcObject = null;
    }

    this.pc?.close();
    this.pc = null;
    this.lastPatientCandidateIdx = 0;
    this.chatConsultationActive = false;
    this.stopMediaTracks();

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(t => t.stop());
      this.remoteStream = null;
    }
  }

  stopMediaTracks() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
  }

  goBack() {
    const caseId = this.patient?.caseId;
    if (caseId) {
      this.http.patch(`${this.baseUrl}/cases/${caseId}/decline`, {}).subscribe({ error: () => {} });
    }
    this.cleanup();
    this.router.navigate(['/queue']);
  }

  toggleChat() {
    this.chatOpen = !this.chatOpen;
    if (this.chatOpen) {
      this.prescriptionOpen = false;
      this.unreadCount = 0;
    }
  }

  sendMessage() {
    const text = this.chatMessage.trim();
    if (!text) return;

    this.chatMessage = '';
    const caseId = this.patient?.caseId;
    if (!caseId) return;

    this.http.post(`${this.baseUrl}/video-sessions/${caseId}/messages`, {
      sender: 'doctor',
      text
    }).subscribe({ error: () => {} });
  }

  startMessagePolling() {
    const caseId = this.patient?.caseId;
    if (!caseId) return;

    clearInterval(this.messagePollInterval);
    this.messagePollInterval = setInterval(() => {
      this.http.get(`${this.baseUrl}/video-sessions/${caseId}/messages`, {
        responseType: 'text'
      }).subscribe({
        next: (raw: string) => {
          try {
            const incoming: any[] = JSON.parse(raw);
            this.ngZone.run(() => {
              if (incoming.length !== this.messages.length) {
                const newOnes = incoming.slice(this.messages.length);
                this.messages = incoming;
                if (!this.chatOpen) {
                  this.unreadCount += newOnes.filter((m: any) => m.sender === 'patient').length;
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

  formatTime(iso: string): string {
    try {
      const d = new Date(iso);
      return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    } catch {
      return '';
    }
  }

  addMedicine() {
    this.medicines.push({ name: '', dosage: '', frequency: '', duration: '' });
  }

  removeMedicine(index: number) {
    if (this.medicines.length > 1) {
      this.medicines.splice(index, 1);
    }
  }

  savePrescription() {
    const doctor = this.getDoctorSession();
    const date = new Date().toLocaleDateString('en-IN');

    const payload = {
      caseId: this.patient?.caseId || null,
      doctorId: doctor.id,
      doctorName: this.getDoctorName(),
      department: doctor.dept || this.patient?.dept || 'General',
      patientName: this.patient?.name || this.patient?.patientName || '',
      symptoms: this.patient?.symptoms || '',
      diagnosis: this.prescription.diagnosis,
      medicines: JSON.stringify(this.medicines),
      investigations: this.prescription.investigations,
      advice: this.prescription.advice,
      followUpDate: this.prescription.followUpDate,
      createdAt: new Date().toISOString()
    };

    this.http.post(`${this.baseUrl}/prescriptions`, payload).subscribe({
      next: () => this.generatePDF(payload, date),
      error: () => this.generatePDF(payload, date)
    });
  }

  generatePDF(data: any, date: string) {
    const doctor = this.getDoctorSession();

    let medsHtml = '';
    try {
      const meds = typeof data.medicines === 'string' ? JSON.parse(data.medicines) : data.medicines;
      const filteredMeds = meds.filter((m: any) => m.name);
      if (filteredMeds.length > 0) {
        medsHtml = `
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px">
            <thead>
              <tr style="background:#f0fafa">
                <th style="border:1px solid #ccc;padding:7px 10px;text-align:left;font-weight:bold">MEDICINE</th>
                <th style="border:1px solid #ccc;padding:7px 10px;text-align:left;font-weight:bold">DOSAGE</th>
                <th style="border:1px solid #ccc;padding:7px 10px;text-align:left;font-weight:bold">FREQUENCY</th>
                <th style="border:1px solid #ccc;padding:7px 10px;text-align:left;font-weight:bold">DURATION</th>
              </tr>
            </thead>
            <tbody>
              ${filteredMeds.map((m: any) => `
                <tr>
                  <td style="border:1px solid #ccc;padding:7px 10px">${m.name}</td>
                  <td style="border:1px solid #ccc;padding:7px 10px">${m.dosage || '—'}</td>
                  <td style="border:1px solid #ccc;padding:7px 10px">${m.frequency || '—'}</td>
                  <td style="border:1px solid #ccc;padding:7px 10px">${m.duration || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`;
      } else {
        medsHtml = `<div style="margin-left:8px;font-size:14px">No medicines prescribed</div>`;
      }
    } catch {
      medsHtml = `<div style="margin-left:8px">${data.medicines}</div>`;
    }

    const html = `<html><head><title>Prescription — ${data.patientName}</title><style>
      *{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:48px 56px;max-width:720px;margin:auto;color:#111}
      .date{text-align:center;font-style:italic;font-size:13px;margin-bottom:12px}.hosp{font-size:22px;font-weight:bold;text-align:center}
      .docname{font-size:16px;font-weight:bold;text-align:center;margin-top:4px}.center{text-align:center;font-size:13px;color:#444;line-height:1.6}
      .divider{border:none;border-top:2.5px solid #0d6e6e;margin:16px 0}.patient-block{font-size:14px;line-height:1.9;margin-bottom:4px}
      .rx-symbol{font-size:30px;font-style:italic;font-weight:bold;margin:20px 0 8px;font-family:Georgia,serif}
      .section-title{font-weight:bold;margin-top:18px;font-size:14px}.section-body{font-size:14px;margin-left:8px;line-height:1.7}
      .footer{margin-top:64px;display:flex;justify-content:space-between;font-size:13px;border-top:1px solid #ddd;padding-top:12px}
    </style></head><body>
      <div class="date">Date: ${date}</div>
      <div class="hosp">MediQueue Hospital</div>
      <div class="docname">${data.doctorName}</div>
      <div class="center">${data.department} Department<br/>Reg. No. MQ/${doctor.id || '001'}</div>
      <hr class="divider"/>
      <div class="patient-block"><b>Patient: ${data.patientName}</b><br/>Symptoms: ${data.symptoms}<br/>Diagnosis: ${data.diagnosis || '—'}</div>
      <hr class="divider"/>
      <div class="rx-symbol">R<sub>x</sub></div>
      ${medsHtml}
      ${data.investigations ? `<div class="section-title">Investigations</div><div class="section-body">${data.investigations}</div>` : ''}
      <div class="section-title">Advice / Referrals</div><div class="section-body">${data.advice || '—'}</div>
      <div class="section-title">Follow-up Date</div><div class="section-body">${data.followUpDate || 'Not specified'}</div>
      <div class="footer"><div><b>${data.doctorName}</b><br/>${data.department}</div><div style="text-align:right">MediQueue Hospital<br/>${date}</div></div>
    </body></html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  }

  getDoctorSession() {
    try {
      return JSON.parse(localStorage.getItem('doctor') || '{}');
    } catch {
      return {};
    }
  }

  getDoctorName(): string {
    return this.getDoctorSession().name || 'Doctor';
  }

  getPatientInitials() {
    if (this.patient?.initials) return this.patient.initials;
    const fullName = this.patient?.name || this.patient?.patientName || '';
    if (!fullName) return 'P';
    const parts = fullName.trim().split(' ');
    return parts.length === 1
      ? parts[0].charAt(0).toUpperCase()
      : (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }

  getMedicinesSummary(): string {
    return this.medicines
      .filter(m => m.name)
      .map(m => `${m.name}${m.dosage ? ' ' + m.dosage : ''}`)
      .join(', ') || '—';
  }

  parseConditions() {
    if (this.patient?.conditions && Array.isArray(this.patient.conditions)) return this.patient.conditions;
    if (!this.patient?.knownConditions) return [];
    return this.patient.knownConditions.split(',').map((x: string) => x.trim());
  }

  parseVisits() {
    if (this.patient?.previousVisits && Array.isArray(this.patient.previousVisits)) return this.patient.previousVisits;
    return [];
  }
}
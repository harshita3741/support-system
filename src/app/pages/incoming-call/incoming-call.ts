import {
  Component, OnInit, OnDestroy, ElementRef,
  ViewChild, ChangeDetectorRef, NgZone
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

  webrtcStatus: 'idle' | 'waiting-offer' | 'connecting' | 'connected' | 'error' = 'idle';
  webrtcStatusMsg = '';

  micOn = true;
  cameraOn = true;
  chatOpen = false;
  prescriptionOpen = false;
  callDuration = 0;

  localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;

  private pc: RTCPeerConnection | null = null;
  private offerPollInterval: any;
  private candidatePollInterval: any;
  private callTimer: any;

  chatMessage = '';
  messages: { sender: 'doctor' | 'patient'; text: string }[] = [];

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
    if (data) this.patient = JSON.parse(data);
  }

  ngOnDestroy() {
    this.cleanup();
  }

  async startVideoCall() {
    this.callAccepted = true;
    this.webrtcStatus = 'waiting-offer';
    this.webrtcStatusMsg = 'Accessing camera...';
    this.cdr.detectChanges();

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      setTimeout(() => {
        this.attachLocalStream();
      }, 100);

      this.micOn = true;
      this.cameraOn = true;

      this.pc = new RTCPeerConnection(STUN_SERVERS);

      this.pc.oniceconnectionstatechange = () => {
        console.log('[ICE] connection state:', this.pc?.iceConnectionState);
      };

      this.pc.onconnectionstatechange = () => {
        console.log('[PEER] connection state:', this.pc?.connectionState);
      };

      this.localStream.getTracks().forEach(track => {
        this.pc!.addTrack(track, this.localStream!);
      });

      this.pc.ontrack = (event) => {
        this.ngZone.run(() => {
          if (event.streams && event.streams[0]) {
            this.remoteStream = event.streams[0];
            setTimeout(() => {
              this.attachRemoteStream();
            }, 100);
          }

          this.webrtcStatus = 'connected';
          this.webrtcStatusMsg = '';

          if (!this.callTimer) {
            this.startCallTimer();
          }

          this.cdr.detectChanges();
        });
      };

      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          const caseId = this.patient?.caseId;
          if (caseId) {
            this.http.post(
              `${this.baseUrl}/video-sessions/${caseId}/candidate/doctor`,
              { candidate: JSON.stringify(event.candidate) }
            ).subscribe();
          }
        }
      };

      this.webrtcStatusMsg = 'Waiting for patient to join...';
      this.cdr.detectChanges();
      this.pollForPatientOffer();

    } catch (err: any) {
      this.ngZone.run(() => {
        this.webrtcStatus = 'error';
        this.webrtcStatusMsg =
          err.name === 'NotAllowedError'
            ? 'Camera/microphone access denied. Please allow access and try again.'
            : 'Could not start video: ' + (err.message || 'Unknown error');
        this.cdr.detectChanges();
      });
    }
  }

  attachLocalStream() {
    if (this.localVideoRef?.nativeElement && this.localStream) {
      this.localVideoRef.nativeElement.srcObject = this.localStream;
      this.localVideoRef.nativeElement.muted = true;
      this.localVideoRef.nativeElement.play().catch(() => {});
    }
  }

  attachRemoteStream() {
    if (this.remoteVideoRef?.nativeElement && this.remoteStream) {
      this.remoteVideoRef.nativeElement.srcObject = this.remoteStream;
      this.remoteVideoRef.nativeElement.play().catch(() => {});
    }
  }

  pollForPatientOffer() {
    const caseId = this.patient?.caseId;
    if (!caseId) return;

    this.offerPollInterval = setInterval(() => {
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
              ).subscribe();

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

    this.candidatePollInterval = setInterval(() => {
      this.http.get(
        `${this.baseUrl}/video-sessions/${caseId}/candidates/patient`,
        { responseType: 'text' }
      ).subscribe({
        next: async (raw: string) => {
          try {
            const candidates: any[] = JSON.parse(raw);
            for (const c of candidates) {
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

  startCallTimer() {
    this.callTimer = setInterval(() => {
      this.ngZone.run(() => {
        this.callDuration++;
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
      setTimeout(() => this.attachLocalStream(), 50);
    }
  }

  toggleChat() {
    this.chatOpen = !this.chatOpen;
    if (this.chatOpen) this.prescriptionOpen = false;
  }

  togglePrescription() {
    this.prescriptionOpen = !this.prescriptionOpen;
    if (this.prescriptionOpen) this.chatOpen = false;
  }

  endCall() {
    this.cleanup();
    this.callEnded = true;
    this.callAccepted = false;
    localStorage.removeItem('activePatient');
    setTimeout(() => this.router.navigate(['/queue']), 2000);
  }

  cleanup() {
    clearInterval(this.offerPollInterval);
    clearInterval(this.candidatePollInterval);
    clearInterval(this.callTimer);

    this.pc?.close();
    this.pc = null;

    this.stopMediaTracks();

    this.remoteStream = null;
    this.callTimer = null;
    this.callDuration = 0;
    this.webrtcStatus = 'idle';
    this.webrtcStatusMsg = '';
  }

  stopMediaTracks() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
  }

  goBack() {
    this.cleanup();
    this.router.navigate(['/queue']);
  }

  sendMessage() {
    const text = this.chatMessage.trim();
    if (!text) return;
    this.messages.push({ sender: 'doctor', text });
    this.chatMessage = '';
  }

  addMedicine() {
    this.medicines.push({ name: '', dosage: '', frequency: '', duration: '' });
  }

  removeMedicine(index: number) {
    if (this.medicines.length > 1) this.medicines.splice(index, 1);
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
      meds.forEach((m: any) => {
        if (m.name) {
          medsHtml += `<div style="margin:6px 0 2px 16px;font-size:14px">&bull; Tab. ${m.name} ${m.dosage || ''} ${m.frequency || ''} ${m.duration ? 'for ' + m.duration : ''}</div>`;
        }
      });
    } catch {
      medsHtml = `<div style="margin-left:16px">${data.medicines}</div>`;
    }

    const html = `<html><head><title>Prescription</title><style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;padding:48px 56px;max-width:720px;margin:auto;color:#111}
      .hosp{font-size:22px;font-weight:bold;text-align:center}
      .docname{font-size:16px;font-weight:bold;text-align:center;margin-top:4px}
      .center{text-align:center;font-size:13px;color:#444;line-height:1.6}
      .divider{border:none;border-top:2.5px solid #0d6e6e;margin:16px 0}
      .patient-block{font-size:14px;line-height:1.9;margin-bottom:4px}
      .rx-symbol{font-size:30px;font-style:italic;font-weight:bold;margin:20px 0 8px;font-family:Georgia,serif}
      .section-title{font-weight:bold;margin-top:18px;font-size:14px}
      .section-body{font-size:14px;margin-left:8px;line-height:1.7}
      .footer{margin-top:64px;display:flex;justify-content:space-between;font-size:13px;border-top:1px solid #ddd;padding-top:12px}
    </style></head><body>
      <div style="text-align:center;font-style:italic;font-size:13px;margin-bottom:12px">Date: ${date}</div>
      <div class="hosp">MediQueue Hospital</div>
      <div class="docname">${data.doctorName}</div>
      <div class="center">${data.department} Department<br/>Reg. No. MQ/${doctor.id || '001'}</div>
      <hr class="divider"/>
      <div class="patient-block"><b>Patient: ${data.patientName}</b><br/>Symptoms: ${data.symptoms}<br/>Diagnosis: ${data.diagnosis || '—'}</div>
      <hr class="divider"/>
      <div class="rx-symbol">R<sub>x</sub></div>
      ${medsHtml || '<div style="margin-left:16px;font-size:14px">No medicines prescribed</div>'}
      ${data.investigations ? `<div class="section-title">Investigations</div><div class="section-body">${data.investigations}</div>` : ''}
      <div class="section-title">Advice</div><div class="section-body">${data.advice || '—'}</div>
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
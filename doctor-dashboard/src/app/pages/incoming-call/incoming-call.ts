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
    { urls: 'turn:openrelay.metered.ca:80',  username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
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
  callAccepted   = false;
  callEnded      = false;
  endedByPatient = false;
  endedReason    = '';
  private endHandled = false;
  isRemoteVideoOff   = false;
  videoUpgradeReady  = false;

  get consultationType(): string { return (this.patient?.consultationType || 'VIDEO').toUpperCase(); }
  get isChatConsultation(): boolean { return this.consultationType === 'CHAT'; }

  webrtcStatus: 'idle' | 'waiting-offer' | 'connecting' | 'connected' | 'error' = 'idle';
  webrtcStatusMsg = '';

  micOn    = true;
  cameraOn = true;
  chatOpen = false;
  prescriptionOpen = false;
  callDuration = 0;

  chatConsultationActive = false;
  switchingToVideo       = false;

  localStream:  MediaStream | null = null;
  remoteStream: MediaStream | null = null;
  private pc: RTCPeerConnection | null = null;
  private offerPollInterval: any;
  private candidatePollInterval: any;
  private statusPollInterval: any;
  private callTimer: any;
  private messagePollInterval: any;
  unreadCount = 0;

  chatMessage = '';
  messages: { sender: string; text: string; time: string }[] = [];

  medicines: { name: string; dosage: string; frequency: string; duration: string }[] = [
    { name: '', dosage: '', frequency: '', duration: '' }
  ];
  prescription = { diagnosis: '', advice: '', investigations: '', followUpDate: '', followUpTime: '' };

  private baseUrl = 'http://192.168.1.76:8080';

  @ViewChild('localVideo')  localVideoRef!:  ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideoRef!: ElementRef<HTMLVideoElement>;

  constructor(
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    const raw = localStorage.getItem('activePatient');
    if (!raw) { this.router.navigate(['/queue']); return; }
    this.patient = JSON.parse(raw);
    if (this.consultationType === 'CHAT') {
      this.startChatConsultation();
    } else {
      this.startVideoConsultation();
    }
  }

  ngOnDestroy() { this.cleanup(); }

  // ── Helpers ────────────────────────────────────────────────────

  getDoctorSession(): any {
    try { const r = localStorage.getItem('doctor'); if (r) return JSON.parse(r); } catch {}
    return { id: null, name: 'Doctor', dept: 'GENERAL' };
  }
  getDoctorName(): string { return this.getDoctorSession()?.name || 'Doctor'; }

  // ── Button stubs referenced in HTML ───────────────────────────

  acceptChatConsultation() { this.startChatConsultation(); }
  startVideoCall()         { this.startVideoConsultation(); }

  joinVideoCallFromChat() {
    this.videoUpgradeReady     = false;
    this.chatConsultationActive = false;
    clearInterval(this.messagePollInterval);
    clearInterval(this.statusPollInterval);
    this.cdr.detectChanges();
    this.startVideoConsultation();
  }

  // ── CHAT CONSULTATION ──────────────────────────────────────────

  startChatConsultation() {
    this.callAccepted          = true;
    this.chatConsultationActive = true;
    const caseId = this.patient?.caseId;
    if (!caseId) return;
    this.acceptCase(caseId);
    this.startMessagePolling(caseId);
    this.startStatusPolling(caseId);
    this.cdr.detectChanges();
  }

  acceptCase(caseId: string) {
    const doctorId = this.getDoctorSession()?.id || '1';
    this.http.patch(`${this.baseUrl}/cases/${caseId}/accept`,
      { doctorId: String(doctorId) }
    ).subscribe({ error: () => {} });
  }

  // ── Message polling — /video-sessions/{caseId}/messages ───────

  startMessagePolling(caseId: string) {
    clearInterval(this.messagePollInterval);
    this.messagePollInterval = setInterval(() => {
      this.http.get(`${this.baseUrl}/video-sessions/${caseId}/messages`,
        { responseType: 'text' }
      ).subscribe({
        next: (raw: string) => {
          try {
            const msgs: any[] = JSON.parse(raw);
            this.ngZone.run(() => {
              if (msgs.length !== this.messages.length) {
                const newPatient = msgs.slice(this.messages.length)
                  .filter((m: any) => m.sender === 'patient');
                this.messages = msgs;
                if (!this.chatOpen && newPatient.length > 0) this.unreadCount += newPatient.length;
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
    const text = this.chatMessage.trim();
    if (!text) return;
    const caseId = this.patient?.caseId;
    if (!caseId) return;

    this.messages = [...this.messages, { sender: 'doctor', text, time: new Date().toISOString() }];
    this.chatMessage = '';
    this.cdr.detectChanges();

    this.http.post(`${this.baseUrl}/video-sessions/${caseId}/messages`,
      { sender: 'doctor', text }
    ).subscribe({ error: () => {} });
  }

  // ── Status polling (chat mode) ─────────────────────────────────

  startStatusPolling(caseId: string) {
    clearInterval(this.statusPollInterval);
    this.statusPollInterval = setInterval(() => {
      this.http.get<any>(`${this.baseUrl}/cases/${caseId}/status`).subscribe({
        next: (res) => {
          const status = (res?.status || '').toUpperCase();
          const type   = (res?.consultationType || 'CHAT').toUpperCase();
          this.ngZone.run(() => {
            if ((status === 'ENDED' || status === 'DECLINED') && !this.endHandled) {
              clearInterval(this.statusPollInterval);
              this.endHandled    = true;
              this.callEnded     = true;
              this.endedByPatient = true;
              this.endedReason   = 'Patient ended the consultation.';
              this.cdr.detectChanges();
            }
            if (type === 'VIDEO' && !this.videoUpgradeReady && !this.switchingToVideo) {
              this.videoUpgradeReady = true;
              this.cdr.detectChanges();
            }
          });
        },
        error: () => {}
      });
    }, 3000);
  }

  switchToVideo() {
    if (this.switchingToVideo) return;
    this.switchingToVideo = true;
    const caseId = this.patient?.caseId;
    this.http.patch(`${this.baseUrl}/cases/${caseId}/upgrade-to-video`, {}).subscribe({
      next: () => { this.ngZone.run(() => { this.switchingToVideo = false; this.joinVideoCallFromChat(); }); },
      error: () => { this.ngZone.run(() => { this.switchingToVideo = false; this.cdr.detectChanges(); }); }
    });
  }

  // ── VIDEO CONSULTATION ─────────────────────────────────────────

  async startVideoConsultation() {
    this.chatConsultationActive = false;
    this.callAccepted           = true;
    try {
      this.webrtcStatus    = 'waiting-offer';
      this.webrtcStatusMsg = 'Waiting for patient to connect...';
      this.cdr.detectChanges();

      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setTimeout(() => {
        if (this.localVideoRef?.nativeElement)
          this.localVideoRef.nativeElement.srcObject = this.localStream;
      }, 100);

      this.pollForPatientOffer();

    } catch (err: any) {
      this.ngZone.run(() => {
        this.webrtcStatus    = 'error';
        this.webrtcStatusMsg = err.name === 'NotAllowedError'
          ? 'Camera/microphone access denied.' : 'Could not access camera/microphone';
        this.cdr.detectChanges();
      });
    }
  }

  pollForPatientOffer() {
    const caseId = this.patient?.caseId;
    if (!caseId) return;

    const statusInterval = setInterval(() => {
      this.http.get<any>(`${this.baseUrl}/cases/${caseId}/status`).subscribe({
        next: (res) => {
          const status = (res?.status || '').toUpperCase();
          this.ngZone.run(() => {
            if ((status === 'ENDED' || status === 'DECLINED') && !this.endHandled) {
              clearInterval(statusInterval);
              clearInterval(this.offerPollInterval);
              this.endHandled    = true;
              this.callEnded     = true;
              this.endedByPatient = true;
              this.endedReason   = 'Patient ended the consultation.';
              this.cdr.detectChanges();
            }
          });
        },
        error: () => {}
      });
    }, 3000);

    // ✅ FIXED: correct endpoint /video-sessions/{caseId}/offer
    this.offerPollInterval = setInterval(async () => {
      this.http.get<any>(`${this.baseUrl}/video-sessions/${caseId}/offer`).subscribe({
        next: async (res) => {
          if (res?.sdp) {
            clearInterval(this.offerPollInterval);
            clearInterval(statusInterval);
            await this.handlePatientOffer(res, caseId);
          }
        },
        error: () => {}
      });
    }, 2000);
  }

  async handlePatientOffer(offerRes: any, caseId: string) {
    this.pc = new RTCPeerConnection(STUN_SERVERS);
    this.remoteStream = new MediaStream();

    this.pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach(t => this.remoteStream!.addTrack(t));
      this.ngZone.run(() => {
        if (this.remoteVideoRef?.nativeElement)
          this.remoteVideoRef.nativeElement.srcObject = this.remoteStream;
        this.webrtcStatus    = 'connected';
        this.webrtcStatusMsg = 'Connected';
        this.startCallTimer();
        this.startMessagePolling(caseId);   // enable in-call chat
        this.cdr.detectChanges();
      });
    };

    // ✅ FIXED: send to /video-sessions/{caseId}/candidate/doctor with JSON.stringify
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.http.post(`${this.baseUrl}/video-sessions/${caseId}/candidate/doctor`,
          { candidate: JSON.stringify(event.candidate) }
        ).subscribe({ error: () => {} });
      }
    };

    this.localStream?.getTracks().forEach(t => this.pc!.addTrack(t, this.localStream!));

    try {
      // ✅ FIXED: offerRes.sdp is JSON.stringify'd — parse it first
      const offerObj = JSON.parse(offerRes.sdp);
      await this.pc.setRemoteDescription(new RTCSessionDescription(offerObj));

      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);

      // ✅ FIXED: post to /video-sessions/{caseId}/answer with JSON.stringify(answer)
      this.http.post(`${this.baseUrl}/video-sessions/${caseId}/answer`,
        { sdp: JSON.stringify(answer) }
      ).subscribe({ error: () => {} });

      this.ngZone.run(() => {
        this.webrtcStatus    = 'connecting';
        this.webrtcStatusMsg = 'Establishing stream...';
        this.cdr.detectChanges();
      });

      this.pollForCandidates(caseId);

    } catch (err) {
      this.ngZone.run(() => {
        this.webrtcStatus    = 'error';
        this.webrtcStatusMsg = 'WebRTC setup failed. Please try again.';
        this.cdr.detectChanges();
      });
    }
  }

  pollForCandidates(caseId: string) {
    this.candidatePollInterval = setInterval(() => {
      // ✅ FIXED: correct endpoint, responseType text
      this.http.get(`${this.baseUrl}/video-sessions/${caseId}/candidates/patient`,
        { responseType: 'text' }
      ).subscribe({
        next: async (raw: string) => {
          try {
            const arr: any[] = JSON.parse(raw);
            for (const c of arr) {
              const candidate = typeof c === 'string' ? JSON.parse(c) : c;
              if (this.pc && candidate?.candidate)
                await this.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
            }
          } catch (_) {}
        },
        error: () => {}
      });
    }, 2000);
  }

  // ── Timer ──────────────────────────────────────────────────────

  startCallTimer() {
    clearInterval(this.callTimer);
    this.callTimer = setInterval(() => {
      this.ngZone.run(() => { this.callDuration++; this.cdr.detectChanges(); });
    }, 1000);
  }

  getCallTime(): string {
    const m = Math.floor(this.callDuration / 60);
    const s = this.callDuration % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  formatTime(ts: string): string {
    try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  }

  // ── Controls ───────────────────────────────────────────────────

  toggleMic()    { this.micOn    = !this.micOn;    this.localStream?.getAudioTracks().forEach(t => t.enabled = this.micOn); }
  toggleCamera() { this.cameraOn = !this.cameraOn; this.localStream?.getVideoTracks().forEach(t => t.enabled = this.cameraOn); }
  toggleChat()   { this.chatOpen = !this.chatOpen; if (this.chatOpen) this.unreadCount = 0; }
  togglePrescription() { this.prescriptionOpen = !this.prescriptionOpen; if (this.prescriptionOpen) this.chatOpen = false; }

  endCall() {
    const caseId = this.patient?.caseId;
    if (caseId) this.http.patch(`${this.baseUrl}/cases/${caseId}/end`, {}).subscribe({ error: () => {} });
    this.callEnded = true;
    this.cleanup();
    this.cdr.detectChanges();
  }

  goBack() {
    const caseId = this.patient?.caseId;
    if (caseId) this.http.patch(`${this.baseUrl}/cases/${caseId}/decline`, {}).subscribe({ error: () => {} });
    this.cleanup();
    this.router.navigate(['/queue']);
  }

  cleanup() {
    clearInterval(this.offerPollInterval);
    clearInterval(this.candidatePollInterval);
    clearInterval(this.statusPollInterval);
    clearInterval(this.callTimer);
    clearInterval(this.messagePollInterval);
    this.pc?.close();
    this.localStream?.getTracks().forEach(t => t.stop());
  }

  // ── Prescription ───────────────────────────────────────────────

  addMedicine()             { this.medicines.push({ name: '', dosage: '', frequency: '', duration: '' }); }
  removeMedicine(i: number) { if (this.medicines.length > 1) this.medicines.splice(i, 1); }

  savePrescription() {
    const doctor = this.getDoctorSession();
    const now    = new Date();
    const date   = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'numeric', year: 'numeric' });
    const payload = {
      caseId: this.patient?.caseId || null,
      doctorId: doctor.id, doctorName: this.getDoctorName(),
      department: doctor.dept || this.patient?.dept || 'GENERAL',
      patientName: this.patient?.name || this.patient?.patientName || '',
      symptoms: this.patient?.symptoms || '',
      diagnosis: this.prescription.diagnosis,
      medicines: JSON.stringify(this.medicines),
      investigations: this.prescription.investigations,
      advice: this.prescription.advice,
      followUpDate: this.prescription.followUpDate && this.prescription.followUpTime
        ? `${this.prescription.followUpDate}T${this.prescription.followUpTime}` : this.prescription.followUpDate,
      createdAt: now.toISOString()
    };
    this.http.post(`${this.baseUrl}/prescriptions`, payload).subscribe({
      next:  () => { this.autoBookFollowUp(payload); this.generatePDF(payload, date); },
      error: () => { this.autoBookFollowUp(payload); this.generatePDF(payload, date); }
    });
  }

  autoBookFollowUp(payload: any) {
    if (!payload.followUpDate || !payload.followUpTime) return;
    const doctor = this.getDoctorSession();
    this.http.post(`${this.baseUrl}/appointments/book`, {
      patientName: payload.patientName, doctorId: doctor.id || payload.doctorId,
      doctorName: this.getDoctorName(), department: payload.department,
      reason: `Follow-up: ${payload.diagnosis || 'Consultation'}`,
      appointmentTime: `${payload.followUpDate}T${payload.followUpTime}:00`, status: 'BOOKED'
    }).subscribe({ error: () => {} });
  }

  generatePDF(data: any, date: string) {
    const doctor = this.getDoctorSession();
    let medsHtml = '';
    try {
      const meds = typeof data.medicines === 'string' ? JSON.parse(data.medicines) : data.medicines;
      const v = (meds||[]).filter((m: any) => m.name?.trim());
      medsHtml = v.length > 0
        ? `<table style="width:100%;border-collapse:collapse;margin-top:8px;"><thead><tr style="border-bottom:1px solid #ccc;"><th style="text-align:left;padding:4px 8px 4px 0;font-size:12px;color:#666;">MEDICINE</th><th style="text-align:left;padding:4px 8px;font-size:12px;color:#666;">DOSAGE</th><th style="text-align:left;padding:4px 8px;font-size:12px;color:#666;">FREQUENCY</th><th style="text-align:left;padding:4px 0;font-size:12px;color:#666;">DURATION</th></tr></thead><tbody>${v.map((m: any) => `<tr><td style="padding:5px 8px 5px 0;font-size:13px;">${m.name||''}</td><td style="padding:5px 8px;font-size:13px;color:#444;">${m.dosage||'—'}</td><td style="padding:5px 8px;font-size:13px;color:#444;">${m.frequency||'—'}</td><td style="padding:5px 0;font-size:13px;color:#444;">${m.duration||'—'}</td></tr>`).join('')}</tbody></table>`
        : '<p style="font-size:13px;color:#555;">No medicines prescribed</p>';
    } catch { medsHtml = `<p>${data.medicines||''}</p>`; }

    const fDate = data.followUpDate ? (() => { try { const d = new Date(data.followUpDate); return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`; } catch { return data.followUpDate; } })() : '';
    const fFull = fDate && data.followUpTime ? `${fDate} at ${data.followUpTime}` : fDate;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Prescription</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Times New Roman',serif;color:#111;padding:48px 56px;max-width:760px;margin:0 auto;}.hosp{font-size:24px;font-weight:bold;text-align:center;margin-bottom:4px;}.doc-name{font-size:15px;font-weight:bold;text-align:center;margin-bottom:2px;}.center-sm{text-align:center;font-size:13px;color:#444;line-height:1.7;}hr{border:none;border-top:1.5px solid #222;margin:14px 0;}.rx-symbol{font-size:44px;font-weight:bold;font-style:italic;font-family:Georgia,serif;margin:16px 0 8px;}.section-head{font-weight:bold;font-size:14px;margin-top:16px;margin-bottom:4px;}.section-val{font-size:13px;line-height:1.7;}.footer{margin-top:56px;display:flex;justify-content:space-between;padding-top:12px;border-top:1px solid #ccc;font-size:13px;}@media print{body{padding:32px;}}</style></head><body>
<div style="text-align:center;font-style:italic;font-size:13px;margin-bottom:14px;">Date: ${date}</div>
<div class="hosp">MediQueue Hospital</div><div class="doc-name">${data.doctorName}</div>
<div class="center-sm">${data.department} Department<br/>Reg. No. MQ/${doctor.id||'001'}</div>
<hr/><div style="font-weight:bold;font-size:14px;margin-bottom:6px;">Patient: ${data.patientName}</div>
${data.symptoms?`<div style="font-size:13px;margin-bottom:3px;">Symptoms: ${data.symptoms}</div>`:''}
${data.diagnosis?`<div style="font-size:13px;margin-bottom:3px;">Diagnosis: ${data.diagnosis}</div>`:''}
<hr/><div class="rx-symbol"><i>R<sub>x</sub></i></div>${medsHtml}
${data.investigations?.trim()?`<div class="section-head">Investigations</div><div class="section-val">${data.investigations}</div>`:''}
${data.advice?.trim()?`<div class="section-head">Advice / Referrals</div><div class="section-val">${data.advice}</div>`:''}
${fFull?`<div class="section-head">Follow-up Date</div><div class="section-val">${fFull}</div>`:''}
<div class="footer"><div><strong>${data.doctorName}</strong><br/>${data.department}</div><div style="text-align:right">MediQueue Hospital<br/>${date}</div></div>
<script>window.onload=function(){window.print();}</script></body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  }

  getPatientInitials(): string {
    if (this.patient?.initials) return this.patient.initials;
    const name = this.patient?.name || this.patient?.patientName || '';
    if (!name) return 'P';
    const parts = name.trim().split(' ');
    return parts.length === 1 ? parts[0].charAt(0).toUpperCase() : (parts[0].charAt(0)+parts[1].charAt(0)).toUpperCase();
  }

  getMedicinesSummary(): string {
    return this.medicines.filter(m => m.name).map(m => `${m.name}${m.dosage?' '+m.dosage:''}`).join(', ') || '—';
  }

  parseConditions(): string[] {
    if (this.patient?.conditions && Array.isArray(this.patient.conditions)) return this.patient.conditions;
    if (!this.patient?.knownConditions) return [];
    return this.patient.knownConditions.split(',').map((x: string) => x.trim());
  }

  parseVisits(): any[] {
    if (this.patient?.previousVisits && Array.isArray(this.patient.previousVisits)) return this.patient.previousVisits;
    return [];
  }
}

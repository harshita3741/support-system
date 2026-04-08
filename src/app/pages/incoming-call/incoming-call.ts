import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

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

  micOn = true;
  cameraOn = true;
  chatOpen = false;
  prescriptionOpen = false;

  localStream: MediaStream | null = null;
  chatMessage = '';

  messages: { sender: 'doctor' | 'patient'; text: string }[] = [
    { sender: 'patient', text: 'Hello doctor, I have chest pain.' },
    { sender: 'doctor', text: 'Since when are you feeling it?' }
  ];

  // Supports multiple medicines
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

  private baseUrl = 'http://192.168.1.5:8080'; // ← change to friend's IP

  @ViewChild('localVideo') localVideoRef!: ElementRef<HTMLVideoElement>;

  constructor(private router: Router, private http: HttpClient) {}

  // ─── LIFECYCLE ───────────────────────────────────────────────

  ngOnInit() {
    const data = localStorage.getItem('activePatient');
    if (data) {
      this.patient = JSON.parse(data);
      console.log('Loaded patient:', this.patient);
    }
  }

  ngOnDestroy() {
    this.stopMediaTracks();
  }

  // ─── CALL CONTROLS ───────────────────────────────────────────

  async startVideoCall() {
    this.callAccepted = true;

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // Small delay to ensure @if(callAccepted) has rendered the video element
      setTimeout(() => {
        if (this.localVideoRef?.nativeElement && this.localStream) {
          this.localVideoRef.nativeElement.srcObject = this.localStream;
          this.localVideoRef.nativeElement.muted = true;
          this.localVideoRef.nativeElement.play();
        }
      }, 50); 

      this.micOn = true;
      this.cameraOn = true;
    } catch (err: any) {
      console.error('Could not access camera/microphone:', err);
      this.cameraOn = false;
      this.micOn = false;
      alert('Camera or microphone permission denied, or no device found.');
    }
  }

  toggleMic() {
    if (!this.localStream) return;
    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length > 0) {
      this.micOn = !this.micOn;
      audioTracks.forEach(track => track.enabled = this.micOn);
    }
  }

  /**
   * FIX: Re-attaches stream to video element when turning back on.
   *
   */
  toggleCamera() {
    if (!this.localStream) return;

    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length > 0) {
      this.cameraOn = !this.cameraOn;
      videoTracks.forEach(track => track.enabled = this.cameraOn);

      if (this.cameraOn) {
        setTimeout(() => {
          if (this.localVideoRef?.nativeElement) {
            this.localVideoRef.nativeElement.srcObject = this.localStream;
            this.localVideoRef.nativeElement.play().catch(() => {});
          }
        }, 50); 
      }
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
    this.callEnded = true;
    this.callAccepted = false;
    this.stopMediaTracks();
    localStorage.removeItem('activePatient');

    setTimeout(() => {
      this.router.navigate(['/queue']);
    }, 2000);
  }

  stopMediaTracks() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  goBack() {
    this.stopMediaTracks();
    this.router.navigate(['/queue']);
  }

  // ─── CHAT ────────────────────────────────────────────────────

  sendMessage() {
    const text = this.chatMessage.trim();
    if (!text) return;

    this.messages.push({ sender: 'doctor', text });
    this.chatMessage = '';

    setTimeout(() => {
      this.messages.push({ sender: 'patient', text: 'Okay doctor.' });
    }, 800);
  }

  // ─── MEDICINES ───────────────────────────────────────────────

  addMedicine() {
    this.medicines.push({ name: '', dosage: '', frequency: '', duration: '' });
  }

  removeMedicine(index: number) {
    if (this.medicines.length > 1) {
      this.medicines.splice(index, 1);
    }
  }

  // ─── PRESCRIPTION SAVE + PDF ──────────

  savePrescription() {
    const doctor = this.getDoctorSession();
    const date = new Date().toLocaleDateString('en-IN');

    const payload = {
      caseId:      this.patient?.caseId || null,
      doctorId:    doctor.id,
      doctorName:  this.getDoctorName(),
      department:  doctor.dept || this.patient?.dept || 'General',
      patientName: this.patient?.name || this.patient?.patientName || '',
      symptoms:    this.patient?.symptoms || '',
      diagnosis:   this.prescription.diagnosis,
      medicines:   JSON.stringify(this.medicines),
      investigations: this.prescription.investigations,
      advice:      this.prescription.advice,
      followUpDate: this.prescription.followUpDate,
      createdAt:   new Date().toISOString()
    };

    this.http.post(`${this.baseUrl}/prescriptions`, payload).subscribe({
      next: () => {
        console.log('Prescription saved to backend');
        this.generatePDF(payload, date);
      },
      error: (err) => {
        console.warn('Backend save failed, generating PDF anyway:', err);
        this.generatePDF(payload, date);
      }
    });
  }

  generatePDF(data: any, date: string) {
    const doctor = this.getDoctorSession();

    let medsHtml = '';
    try {
      const meds = typeof data.medicines === 'string'
        ? JSON.parse(data.medicines)
        : data.medicines;

      meds.forEach((m: any) => {
        if (m.name) {
          medsHtml += `
            <div style="margin: 6px 0 2px 16px; font-size: 14px;">
              &bull; Tab. ${m.name} 
              ${m.dosage ? m.dosage + ' ' : ''} 
              ${m.frequency ? m.frequency + ' ' : ''} 
              ${m.duration ? 'for ' + m.duration : ''}
            </div>`;
        }
      });
    } catch {
      medsHtml = `<div style="margin-left:16px">${data.medicines}</div>`;
    }

    const html = `
      <html>
      <head>
        <title>Prescription — ${data.patientName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; padding: 48px 56px; max-width: 720px; margin: auto; color: #111; }
          .date { text-align: center; font-style: italic; font-size: 13px; margin-bottom: 12px; }
          .hosp { font-size: 22px; font-weight: bold; text-align: center; }
          .docname { font-size: 16px; font-weight: bold; text-align: center; margin-top: 4px; }
          .center { text-align: center; font-size: 13px; color: #444; line-height: 1.6; }
          .divider { border: none; border-top: 2.5px solid #0d6e6e; margin: 16px 0; }
          .patient-block { font-size: 14px; line-height: 1.9; margin-bottom: 4px; }
          .rx-symbol { font-size: 30px; font-style: italic; font-weight: bold; margin: 20px 0 8px; font-family: Georgia, serif; }
          .section-title { font-weight: bold; margin-top: 18px; font-size: 14px; }
          .section-body { font-size: 14px; margin-left: 8px; line-height: 1.7; }
          .footer { margin-top: 64px; display: flex; justify-content: space-between; font-size: 13px; border-top: 1px solid #ddd; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="date">Date: ${date}</div>
        <div class="hosp">MediQueue Hospital</div>
        <div class="docname">${data.doctorName}</div>
        <div class="center">${data.department} Department<br/>Reg. No. MQ/${doctor.id || '001'}</div>
        <hr class="divider"/>
        <div class="patient-block">
          <b>Patient: ${data.patientName}</b><br/>
          Symptoms: ${data.symptoms}<br/>
          Diagnosis: ${data.diagnosis || '—'}
        </div>
        <hr class="divider"/>
        <div class="rx-symbol">R<sub>x</sub></div>
        ${medsHtml || '<div style="margin-left:16px;font-size:14px">No medicines prescribed</div>'}
        ${data.investigations ? `<div class="section-title">Investigations</div><div class="section-body">${data.investigations}</div>` : ''}
        <div class="section-title">Advice / Referrals</div>
        <div class="section-body">${data.advice || '—'}</div>
        <div class="section-title">Follow-up Date</div>
        <div class="section-body">${data.followUpDate || 'Not specified'}</div>
        <div class="footer">
          <div><b>${data.doctorName}</b><br/>${data.department}</div>
          <div style="text-align:right">MediQueue Hospital<br/>${date}</div>
        </div>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500); 
    }
  }

  // ─── HELPERS ─────────────────────────────────────────────────

  getDoctorSession() {
    try {
      return JSON.parse(localStorage.getItem('doctor') || '{}');
    } catch {
      return {};
    }
  }

  // FIXED: This was missing and causing the TS2339 error
  getDoctorName(): string {
    const session = this.getDoctorSession();
    return session.name || 'Dr. Satyendra'; 
  }

  getPatientInitials() {
    if (this.patient?.initials) return this.patient.initials;
    const fullName = this.patient?.name || this.patient?.patientName || '';
    if (!fullName) return 'P';
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
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
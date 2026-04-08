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

  localStream: MediaStream | null = null;
  chatMessage = '';
  messages: { sender: 'doctor' | 'patient'; text: string }[] = [
    { sender: 'patient', text: 'Hello doctor, I have chest pain.' },
    { sender: 'doctor', text: 'Since when are you feeling it?' }
  ];

  @ViewChild('localVideo') localVideoRef!: ElementRef<HTMLVideoElement>;

  constructor(private router: Router) {}

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

  async startVideoCall() {
    this.callAccepted = true;

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      setTimeout(() => {
        if (this.localVideoRef?.nativeElement && this.localStream) {
          this.localVideoRef.nativeElement.srcObject = this.localStream;
          this.localVideoRef.nativeElement.muted = true;
          this.localVideoRef.nativeElement.play();
        }
      }, 0);

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
      audioTracks.forEach(track => {
        track.enabled = this.micOn;
      });
    }
  }

  toggleCamera() {
    if (!this.localStream) return;

    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length > 0) {
      this.cameraOn = !this.cameraOn;
      videoTracks.forEach(track => {
        track.enabled = this.cameraOn;
      });
    }
  }

  toggleChat() {
    this.chatOpen = !this.chatOpen;
  }

  sendMessage() {
    const text = this.chatMessage.trim();
    if (!text) return;

    this.messages.push({
      sender: 'doctor',
      text: text
    });

    this.chatMessage = '';

    setTimeout(() => {
      this.messages.push({
        sender: 'patient',
        text: 'Okay doctor.'
      });
    }, 800);
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

  parseConditions() {
    if (!this.patient?.knownConditions) return [];
    return this.patient.knownConditions.split(',').map((x: string) => x.trim());
  }

  parseVisits() {
    if (!this.patient?.previousVisits) return [];
    return this.patient.previousVisits.split('|').map((item: string) => {
      const parts = item.split(';');
      return {
        date: parts[0] || '',
        diagnosis: parts[1] || '',
        notes: parts[2] || ''
      };
    });
  }

  getPatientInitials() {
    return this.patient?.patientName?.charAt(0) || 'P';
  }
}

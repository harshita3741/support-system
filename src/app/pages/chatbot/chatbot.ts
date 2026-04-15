import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs/operators';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  time: string;
  caseBadge?: string;
  showVideoCall?: boolean;
  showVideoCallPending?: boolean;
  doctorName?: string;
  caseId?: string;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './chatbot.html',
  styleUrls: ['./chatbot.css']
})
export class ChatbotComponent implements OnInit {

  messages: Message[] = [];
  userInput = '';
  isTyping = false;
  initials = 'HM';
  showAvatarMenu = false;
  suggestions = ['I have a headache', 'Chest pain', 'I have fever', 'Bone fracture'];
  private pollingIntervals: Map<string, any> = new Map();

  constructor(private http: HttpClient, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const name = localStorage.getItem('patientName') || '';
    this.initials = name.split('@')[0].split('.')
      .map((p: string) => p[0]?.toUpperCase()).join('').slice(0, 2) || 'PT';

    this.messages = [{
      text: 'Hello! I am your CareAI health assistant. Describe your symptoms and I will help you.',
      sender: 'bot',
      time: this.getTime()
    }];
  }

  getTime(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  sendSuggestion(text: string) {
    this.userInput = text;
    this.send();
  }

  toggleAvatarMenu() { this.showAvatarMenu = !this.showAvatarMenu; }
  closeMenus() { this.showAvatarMenu = false; }
  logout() { localStorage.clear(); this.router.navigate(['/login']); }

  pollForApproval(msgIndex: number, caseId: string, doctorName: string) {
    const interval = setInterval(() => {
      this.http.get<any>(`http://localhost:8080/cases/${caseId}/status`).subscribe({
        next: (res) => {
          if (res.status === 'ACCEPTED' || res.status === 'approved') {
            clearInterval(interval);
            this.pollingIntervals.delete(caseId);
            // Update the message to show Join Video Call button
            const updated = [...this.messages];
            updated[msgIndex] = { ...updated[msgIndex], showVideoCall: true, showVideoCallPending: false };
            this.messages = updated;
            this.cdr.detectChanges();
          }
        },
        error: () => {}
      });
    }, 5000);
    this.pollingIntervals.set(caseId, interval);
  }

joinVideoCall(doctorName: string) {
  alert(`Connecting you to a video call with ${doctorName}...\n\n(Video call feature coming soon)`);
}

onEnter(event: any) { 
  if (event.key === 'Enter') this.send(); 
}

  send() {
  const text = this.userInput.trim();
  if (!text || this.isTyping) return;

  this.messages = [...this.messages, { text, sender: 'user', time: this.getTime() }];
  this.userInput = '';
  this.isTyping = true;

  this.http.post('http://localhost:8080/chat', { message: text }, { responseType: 'text' })
    .pipe(timeout(15000))
    .subscribe({
      next: (response: string) => {
        console.log('Chat response:', response);
        this.isTyping = false;

        let badge = '';
        let showVideoCallPending = false;
        let doctorName = '';
        let caseId = '';

        // Extract case ID from response if present (format: "Case ID: XXXX" or "caseId: XXXX")
        const caseIdMatch = response.match(/[Cc]ase\s*[Ii][Dd][:\s]+([A-Za-z0-9-]+)/);
        if (caseIdMatch) caseId = caseIdMatch[1];

        if (response.toLowerCase().includes('cardio')) {
          badge = 'Case created - CARDIO dept';
          showVideoCallPending = true;
          doctorName = 'Dr. Smith (Cardiologist)';
        } else if (response.toLowerCase().includes('neuro')) {
          badge = 'Case created - NEURO dept';
          showVideoCallPending = true;
          doctorName = 'Dr. Adams (Neurologist)';
        } else if (response.toLowerCase().includes('ortho')) {
          badge = 'Case created - ORTHO dept';
          showVideoCallPending = true;
          doctorName = 'Dr. Lee (Orthopedic)';
        }

        const msgIndex = this.messages.length;
        this.messages = [...this.messages, {
          text: response,
          sender: 'bot',
          time: this.getTime(),
          caseBadge: badge,
          showVideoCall: false,
          showVideoCallPending,
          doctorName,
          caseId
        }];
        this.cdr.detectChanges();

        // Start polling for doctor approval if a case was created
        if (showVideoCallPending && caseId) {
          this.pollForApproval(msgIndex, caseId, doctorName);
        }
      },
      error: (err) => {
        console.error('Chat error:', err);
        this.isTyping = false;
        this.messages = [...this.messages, {
          text: 'Sorry, could not connect to server. Please try again.',
          sender: 'bot',
          time: this.getTime()
        }];
        this.cdr.detectChanges();
      }
    });
}
}
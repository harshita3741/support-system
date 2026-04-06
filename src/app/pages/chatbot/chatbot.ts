import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  time: string;
  caseBadge?: string;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HttpClientModule],
  templateUrl: './chatbot.html',
  styleUrls: ['./chatbot.css']
})
export class ChatbotComponent {

  messages: Message[] = [
    {
      text: "Hello! I'm your CareAI health assistant. Describe your symptoms and I'll help you.",
      sender: 'bot',
      time: this.getTime()
    }
  ];

  userInput = '';
  isTyping = false;
  suggestions = ['I have a headache', 'Chest pain', 'I have fever', 'Bone fracture'];

  constructor(private http: HttpClient) {}

  getTime(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  sendSuggestion(text: string) {
    this.userInput = text;
    this.send();
  }

  send() {
    const text = this.userInput.trim();
    if (!text) return;

    this.messages.push({ text, sender: 'user', time: this.getTime() });
    this.userInput = '';
    this.isTyping = true;

    this.http.post('http://localhost:8080/api/chat',
      { message: text },
      { responseType: 'text' }
    ).subscribe({
      next: (response: string) => {
        this.isTyping = false;
        let badge = '';
        if (response.includes('cardiology') || response.includes('CARDIO')) badge = 'Case created — CARDIO dept';
        else if (response.includes('neuro') || response.includes('NEURO')) badge = 'Case created — NEURO dept';
        else if (response.includes('orthopedic') || response.includes('ORTHO')) badge = 'Case created — ORTHO dept';

        this.messages.push({
          text: response,
          sender: 'bot',
          time: this.getTime(),
          caseBadge: badge
        });
      },
      error: () => {
        this.isTyping = false;
        this.messages.push({
          text: 'Sorry, could not connect to server. Please try again.',
          sender: 'bot',
          time: this.getTime()
        });
      }
    });
  }

  onEnter(event: any) {
    if (event.key === 'Enter') this.send();
  }
}
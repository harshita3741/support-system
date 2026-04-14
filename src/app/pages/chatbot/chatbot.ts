import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { AuthService } from "../../core/auth";

interface Message {
  text: string;
  sender: "user" | "bot";
  time: string;
  caseBadge?: string;
  inQueue?: boolean;
  doctorName?: string;
  callReady?: boolean;
}

@Component({
  selector: "app-chatbot",
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: "./chatbot.html",
  styleUrls: ["./chatbot.css"]
})
export class ChatbotComponent implements OnInit {
  messages: Message[] = [
    { text: "Hello! I am your CareAI health assistant. Describe your symptoms and I will help you.", sender: "bot", time: this.getTime() }
  ];
  userInput = "";
  isTyping = false;
  initials = "";
  suggestions = ["I have a headache", "Chest pain", "I have fever", "Bone fracture"];

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit() { this.initials = this.auth.getInitials(); }

  getTime(): string {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  sendSuggestion(text: string) {
    if (this.isTyping) return;
    this.userInput = text;
    this.send();
  }

  send() {
    const text = this.userInput.trim();
    if (!text || this.isTyping) return;
    this.messages.push({ text, sender: "user", time: this.getTime() });
    this.userInput = "";
    this.isTyping = true;

    this.http.post("http://localhost:8080/chat", { message: text }, { responseType: "text" }).subscribe({
      next: (response: string) => {
        this.isTyping = false;
        let badge = "";
        let inQueue = false;
        let doctorName = "";

        if (response.toLowerCase().includes("cardio")) {
          badge = "Case created - CARDIO dept";
          inQueue = true;
          doctorName = "Dr. Smith";
        } else if (response.toLowerCase().includes("neuro")) {
          badge = "Case created - NEURO dept";
          inQueue = true;
          doctorName = "Dr. Adams";
        } else if (response.toLowerCase().includes("ortho")) {
          badge = "Case created - ORTHO dept";
          inQueue = true;
          doctorName = "Dr. Lee";
        }

        this.messages.push({ text: response, sender: "bot", time: this.getTime(), caseBadge: badge, inQueue, doctorName, callReady: false });

        if (inQueue) {
          setTimeout(() => {
            this.messages.push({
              text: doctorName + " has accepted your case and is ready to see you!",
              sender: "bot",
              time: this.getTime(),
              inQueue: true,
              doctorName: doctorName,
              callReady: true
            });
          }, 10000);
        }
      },
      error: () => {
        this.isTyping = false;
        this.messages.push({ text: "Sorry, could not connect to server.", sender: "bot", time: this.getTime() });
      }
    });
  }
}

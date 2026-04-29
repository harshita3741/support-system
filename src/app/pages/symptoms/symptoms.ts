import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-symptoms',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './symptoms.html',
  styleUrls: ['./symptoms.css']
})
export class SymptomsComponent implements OnInit {

  initials = '';
  showAvatarMenu = false;
  submitted = false;
  submitting = false;
  redirecting = false;
  fromChatbot = false;
  consultationType: 'VIDEO' | 'CHAT' = 'VIDEO';

  form = {
    chiefComplaint: '',
    duration: '',
    severity: '5',
    bodyArea: '',
    additionalNotes: '',
    department: ''
  };

  durations = ['Less than 1 day', '1–2 days', '3–5 days', '1 week', '2 weeks', 'More than 2 weeks'];
  bodyAreas = ['Head / Neck', 'Chest', 'Abdomen', 'Back / Spine', 'Arms / Shoulders', 'Legs / Knees', 'Joints / Bones', 'Whole body', 'Other'];
  departments = ['CARDIO', 'NEURO', 'ORTHO', 'GENERAL'];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    const name = localStorage.getItem('patientName') || '';
    this.initials = name.split('@')[0].split('.')
      .map((p: string) => p[0]?.toUpperCase()).join('').slice(0, 2) || 'PT';
  }

  ngOnInit() {
    // Pre-fill when navigated from chatbot
    this.route.queryParams.subscribe(params => {
      if (params['complaint']) {
        this.form.chiefComplaint = params['complaint'];
      }
      if (params['dept']) {
        this.form.department = params['dept'];
      }
      this.fromChatbot = params['fromChatbot'] === 'true';
      if (params['consultationType'] === 'CHAT') {
        this.consultationType = 'CHAT';
      } else {
        this.consultationType = 'VIDEO';
      }
    });
  }

  toggleAvatarMenu() { this.showAvatarMenu = !this.showAvatarMenu; }
  closeMenus() { this.showAvatarMenu = false; }
  logout() { localStorage.clear(); this.router.navigate(['/']); }

  get severityLabel(): string {
    const v = parseInt(this.form.severity, 10);
    if (v <= 3) return 'Mild';
    if (v <= 6) return 'Moderate';
    return 'Severe';
  }

  get severityColor(): string {
    const v = parseInt(this.form.severity, 10);
    if (v <= 3) return '#16a34a';
    if (v <= 6) return '#d97706';
    return '#dc2626';
  }

  submitSymptoms() {
    if (!this.form.chiefComplaint.trim()) {
      alert('Please describe your main symptom.');
      return;
    }

    const symptoms = [
      this.form.chiefComplaint,
      this.form.duration ? `Duration: ${this.form.duration}` : '',
      `Severity: ${this.form.severity}/10 (${this.severityLabel})`,
      this.form.bodyArea ? `Area: ${this.form.bodyArea}` : '',
      this.form.additionalNotes ? `Notes: ${this.form.additionalNotes}` : ''
    ].filter(Boolean).join(' | ');

    const dept = this.form.department || this.autoDetectDept(this.form.chiefComplaint);

    // Store data for chatbot to create the case with the correct type
    sessionStorage.setItem('pendingSymptoms', JSON.stringify({ symptoms, dept }));

    // Show success screen with redirect message, then navigate
    this.submitted = true;
    this.redirecting = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.router.navigate(['/chatbot'], { queryParams: { fromSymptoms: 'true' } });
    }, 2500);
  }

  autoDetectDept(complaint: string): string {
    const c = complaint.toLowerCase();
    if (/chest|heart|cardio|palpitat/.test(c)) return 'CARDIO';
    if (/numbness|paralysis|head.?injury|stroke|seizure|convuls|head trauma/.test(c)) return 'NEURO';
    if (/bone|joint|knee|back|fracture|ortho|muscle/.test(c)) return 'ORTHO';
    return 'GENERAL'; // headache, fever, cold → GENERAL
  }
}

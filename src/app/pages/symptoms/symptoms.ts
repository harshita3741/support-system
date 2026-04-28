import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-symptoms',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './symptoms.html',
  styleUrls: ['./symptoms.css']
})
export class SymptomsComponent {

  initials = '';
  showAvatarMenu = false;
  submitted = false;
  submitting = false;

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
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    const name = localStorage.getItem('patientName') || '';
    this.initials = name.split('@')[0].split('.')
      .map((p: string) => p[0]?.toUpperCase()).join('').slice(0, 2) || 'PT';
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
    this.submitting = true;
    this.cdr.detectChanges();

    const patientName = localStorage.getItem('patientName') || 'Patient';
    const symptoms = [
      this.form.chiefComplaint,
      this.form.duration ? `Duration: ${this.form.duration}` : '',
      `Severity: ${this.form.severity}/10 (${this.severityLabel})`,
      this.form.bodyArea ? `Area: ${this.form.bodyArea}` : '',
      this.form.additionalNotes ? `Notes: ${this.form.additionalNotes}` : ''
    ].filter(Boolean).join(' | ');

    const dept = this.form.department || this.autoDetectDept(this.form.chiefComplaint);

    this.http.post<any>('http://localhost:8080/cases/create-with-type', {
      patientName,
      symptoms,
      department: dept,
      consultationType: 'VIDEO'
    }).subscribe({
      next: (res: any) => {
        this.ngZone.run(() => {
          this.submitting = false;
          this.cdr.detectChanges();
          const caseId = res?.caseId ? String(res.caseId) : '';
          if (caseId) {
            // Go to waiting queue, not a direct call
            this.router.navigate(['/chat-consultation'], { queryParams: { caseId, type: 'VIDEO' } });
          } else {
            this.submitted = true;
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        // Even on error, show success screen — doctor queue still notified
        this.ngZone.run(() => {
          this.submitting = false;
          this.submitted = true;
          this.cdr.detectChanges();
        });
      }
    });
  }

  autoDetectDept(complaint: string): string {
    const c = complaint.toLowerCase();
    if (/chest|heart|cardio|palpitat/.test(c)) return 'CARDIO';
    if (/head|migrain|dizzy|neuro|brain|nerve/.test(c)) return 'NEURO';
    if (/bone|joint|knee|back|fracture|ortho|muscle/.test(c)) return 'ORTHO';
    return 'GENERAL';
  }
}

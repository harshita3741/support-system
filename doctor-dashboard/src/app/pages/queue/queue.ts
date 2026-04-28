import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MedicalCaseService } from '../../services/medical-case';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-queue',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './queue.html',
  styleUrl: './queue.css'
})
export class Queue implements OnInit, OnDestroy {

  queueItems: any[] = [];
  loading = true;
  errorMessage = '';
  acceptingId: number | null = null;
  decliningId: number | null = null;
  doctorDept = '';
  private pollInterval: any;

  constructor(
    private router: Router,
    private medicalCaseService: MedicalCaseService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const doctor = this.authService.getSession();
    this.doctorDept = (doctor?.dept || '').toUpperCase();
    this.loadQueue();
    // Poll every 8s so new patient cases appear automatically
    this.pollInterval = setInterval(() => this.loadQueue(), 8000);
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  loadQueue() {
    const doctor = this.authService.getSession();
    if (!doctor || !doctor.id) {
      this.loading = false;
      this.errorMessage = 'Doctor session not found. Please log in again.';
      return;
    }

    this.medicalCaseService.getQueue().subscribe({
      next: (data: any[]) => {
        const dept = (doctor.dept || '').toUpperCase();
        // Show OPEN cases for this doctor's department
        this.queueItems = (Array.isArray(data) ? data : []).filter(
          (c: any) => !dept || c.department === dept
        );
        this.loading = false;
        this.errorMessage = '';
      },
      error: (err) => {
        console.error('Error fetching queue:', err);
        this.loading = false;
        this.errorMessage = 'Unable to load queue. Is the backend running?';
      }
    });
  }

  acceptPatient(patient: any) {
    const doctor = this.authService.getSession();
    if (!doctor) return;

    this.acceptingId = patient.caseId;

    // 1. Tell backend this case is ACCEPTED
    this.medicalCaseService.acceptCase(patient.caseId, String(doctor.id)).subscribe({
      next: () => {
        this.acceptingId = null;
        // 2. Store accepted patient info and navigate to call screen
        const patientData = {
          ...patient,
          name:       patient.patientName,
          initials:   this.getInitials(patient.patientName),
          dept:       patient.department,
          bg:         this.getAvatarBg(patient.priority || ''),
          color:      this.getAvatarColor(patient.priority || ''),
          priority:   patient.priority || 'Medium',
          doctorId:   doctor.id,
          doctorName: doctor.name
        };
        localStorage.setItem('activePatient', JSON.stringify(patientData));
        this.router.navigate(['/call']);
      },
      error: () => {
        // Navigate anyway so doctor can still see the patient
        this.acceptingId = null;
        const patientData = {
          ...patient,
          name:       patient.patientName,
          initials:   this.getInitials(patient.patientName),
          dept:       patient.department,
          bg:         this.getAvatarBg(patient.priority || ''),
          color:      this.getAvatarColor(patient.priority || ''),
          priority:   patient.priority || 'Medium',
          doctorId:   doctor.id,
          doctorName: doctor.name
        };
        localStorage.setItem('activePatient', JSON.stringify(patientData));
        this.router.navigate(['/call']);
      }
    });
  }

  declinePatient(patient: any) {
    this.decliningId = patient.caseId;
    this.medicalCaseService.declineCase(patient.caseId).subscribe({
      next: () => {
        this.decliningId = null;
        // Remove from queue immediately
        this.queueItems = this.queueItems.filter(q => q.caseId !== patient.caseId);
      },
      error: () => {
        this.decliningId = null;
        // Still remove from local view even on error
        this.queueItems = this.queueItems.filter(q => q.caseId !== patient.caseId);
      }
    });
  }

  getConsultTypeLabel(q: any): string {
    const t = (q.consultationType || 'VIDEO').toUpperCase();
    return t === 'CHAT' ? '💬 Chat' : '📹 Video';
  }

  getConsultTypeClass(q: any): string {
    const t = (q.consultationType || 'VIDEO').toUpperCase();
    return t === 'CHAT' ? 'ctag-chat' : 'ctag-video';
  }

  getPriorityClass(priority: string) {
    if (!priority) return 'prio-medium';
    const p = priority.toLowerCase();
    if (p === 'high') return 'prio-high';
    if (p === 'low') return 'prio-low';
    return 'prio-medium';
  }

  getStatusClass(status: string) {
    if (!status) return 'wait-medium';
    const s = status.toLowerCase();
    if (s === 'open') return 'wait-high';
    if (s === 'accepted') return 'wait-medium';
    return 'wait-low';
  }

  getInitials(name: string): string {
    if (!name) return 'P';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }

  getAvatarBg(priority: string): string {
    const p = (priority || '').toLowerCase();
    if (p === 'high') return '#fef2f2';
    if (p === 'low') return '#f0fdf4';
    return '#eff6ff';
  }

  getAvatarColor(priority: string): string {
    const p = (priority || '').toLowerCase();
    if (p === 'high') return '#b91c1c';
    if (p === 'low') return '#15803d';
    return '#1d4ed8';
  }
}

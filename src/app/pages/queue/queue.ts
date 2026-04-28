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
  /** Popup shown when a new case arrives */
  newCaseNotification: any = null;
  private knownCaseIds = new Set<number>();
  private pollInterval: any;
  private notificationTimeout: any;

  constructor(
    private router: Router,
    private medicalCaseService: MedicalCaseService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const doctor = this.authService.getSession();
    this.doctorDept = (doctor?.dept || '').toUpperCase();
    this.requestNotificationPermission();
    this.loadQueue();
    this.pollInterval = setInterval(() => this.loadQueue(), 8000);
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.notificationTimeout) clearTimeout(this.notificationTimeout);
  }

  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  sendBrowserNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
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
        const filtered = (Array.isArray(data) ? data : []).filter(
          (c: any) => !dept || c.department === dept
        );

        // Detect newly arrived cases
        if (this.knownCaseIds.size > 0) {
          const newCases = filtered.filter((c: any) => !this.knownCaseIds.has(c.caseId));
          if (newCases.length > 0) {
            const newest = newCases[0];
            // Browser notification
            this.sendBrowserNotification(
              'New patient in queue',
              `${newest.patientName} — ${newest.department} · ${newest.symptoms || ''}`
            );
            // In-app popup
            this.newCaseNotification = newest;
            if (this.notificationTimeout) clearTimeout(this.notificationTimeout);
            this.notificationTimeout = setTimeout(() => {
              this.newCaseNotification = null;
            }, 8000);
          }
        }

        // Track all case IDs
        filtered.forEach((c: any) => this.knownCaseIds.add(c.caseId));

        this.queueItems = filtered;
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

  dismissNewCaseNotification() {
    this.newCaseNotification = null;
    if (this.notificationTimeout) clearTimeout(this.notificationTimeout);
  }

  acceptPatient(patient: any) {
    const doctor = this.authService.getSession();
    if (!doctor) return;

    this.acceptingId = patient.caseId;
    this.dismissNewCaseNotification();

    this.medicalCaseService.acceptCase(patient.caseId, String(doctor.id)).subscribe({
      next: () => {
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
      },
      error: () => {
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
        this.queueItems = this.queueItems.filter(q => q.caseId !== patient.caseId);
      },
      error: () => {
        this.decliningId = null;
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

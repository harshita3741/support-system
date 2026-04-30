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
        const raw = Array.isArray(data) ? data : [];

        const filtered = raw
          .filter((c: any) => this.matchesDepartment(c, dept))
          .filter((c: any) => this.isQueueStatus(c?.status))
          .filter((c: any) => !this.isExpiredCase(c));

        const deduped = this.dedupeQueue(filtered)
          .sort((a: any, b: any) => this.sortQueueItems(a, b));

        if (this.knownCaseIds.size > 0) {
          const newCases = deduped.filter((c: any) => !this.knownCaseIds.has(this.getCaseNumericId(c)));
          if (newCases.length > 0) {
            const newest = newCases[0];
            this.sendBrowserNotification(
              'New patient in queue',
              `${newest.patientName} — ${newest.department} · ${newest.symptoms || ''}`
            );
            this.newCaseNotification = newest;
            if (this.notificationTimeout) clearTimeout(this.notificationTimeout);
            this.notificationTimeout = setTimeout(() => {
              this.newCaseNotification = null;
            }, 8000);
          }
        }

        this.knownCaseIds.clear();
        deduped.forEach((c: any) => this.knownCaseIds.add(this.getCaseNumericId(c)));

        this.queueItems = deduped;
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
        this.queueItems = this.queueItems.filter(q => q.caseId !== patient.caseId);

        const patientData = {
          ...patient,
          name: patient.patientName,
          initials: this.getInitials(patient.patientName),
          dept: patient.department,
          bg: this.getAvatarBg(patient.priority || ''),
          color: this.getAvatarColor(patient.priority || ''),
          priority: patient.priority || 'Medium',
          doctorId: doctor.id,
          doctorName: doctor.name
        };

        localStorage.setItem('activePatient', JSON.stringify(patientData));
        this.router.navigate(['/call']);
      },
      error: () => {
        this.acceptingId = null;
        this.queueItems = this.queueItems.filter(q => q.caseId !== patient.caseId);

        const patientData = {
          ...patient,
          name: patient.patientName,
          initials: this.getInitials(patient.patientName),
          dept: patient.department,
          bg: this.getAvatarBg(patient.priority || ''),
          color: this.getAvatarColor(patient.priority || ''),
          priority: patient.priority || 'Medium',
          doctorId: doctor.id,
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

  private matchesDepartment(item: any, dept: string): boolean {
    return !dept || String(item?.department || '').toUpperCase() === dept;
  }

  private isQueueStatus(status: string): boolean {
    const s = String(status || 'OPEN').trim().toUpperCase();
    return s === 'OPEN' || s === 'PENDING' || s === 'WAITING';
  }

  private isExpiredCase(item: any): boolean {
    const now = new Date();
    const dt = this.extractCaseDate(item);

    if (!dt) return false;

    const ageMs = now.getTime() - dt.getTime();
    const futureMs = dt.getTime() - now.getTime();

    if (futureMs > 24 * 60 * 60 * 1000) return true;
    if (ageMs > 12 * 60 * 60 * 1000) return true;

    return false;
  }

  private extractCaseDate(item: any): Date | null {
    const candidates = [
      item?.appointmentTime,
      item?.queuedAt,
      item?.createdAt,
      item?.updatedAt
    ];

    for (const value of candidates) {
      if (!value) continue;
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    }

    if (item?.date && item?.timeSlot) {
      const combined = new Date(`${item.date}T${this.to24Hour(item.timeSlot)}`);
      if (!isNaN(combined.getTime())) return combined;
    }

    if (item?.date) {
      const d = new Date(item.date);
      if (!isNaN(d.getTime())) return d;
    }

    return null;
  }

  private dedupeQueue(items: any[]): any[] {
    const map = new Map<string, any>();

    for (const item of items) {
      const key = this.getDedupKey(item);
      const existing = map.get(key);

      if (!existing) {
        map.set(key, item);
        continue;
      }

      const existingDate = this.extractCaseDate(existing)?.getTime() || 0;
      const currentDate = this.extractCaseDate(item)?.getTime() || 0;

      if (currentDate >= existingDate) {
        map.set(key, item);
      }
    }

    return Array.from(map.values());
  }

  private getDedupKey(item: any): string {
    const caseId = item?.caseId ?? item?.id;
    if (caseId !== undefined && caseId !== null && caseId !== '') {
      return `case-${caseId}`;
    }

    const patient = String(item?.patientName || '').trim().toUpperCase();
    const dept = String(item?.department || '').trim().toUpperCase();
    const when = this.extractCaseDate(item)?.toISOString() || '';
    return `patient-${patient}-${dept}-${when}`;
  }

  private getCaseNumericId(item: any): number {
    const id = Number(item?.caseId ?? item?.id ?? 0);
    return Number.isFinite(id) ? id : 0;
  }

  private sortQueueItems(a: any, b: any): number {
    const prioOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

    const aPriority = prioOrder[String(a?.priority || 'medium').toLowerCase()] ?? 1;
    const bPriority = prioOrder[String(b?.priority || 'medium').toLowerCase()] ?? 1;
    if (aPriority !== bPriority) return aPriority - bPriority;

    const aDate = this.extractCaseDate(a)?.getTime() || 0;
    const bDate = this.extractCaseDate(b)?.getTime() || 0;
    return bDate - aDate;
  }

  private to24Hour(value: string): string {
    const t = (value || '').trim().toUpperCase();
    const ampm = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);

    if (ampm) {
      let h = Number(ampm[1]);
      const m = ampm[2];
      const suffix = ampm[3];

      if (suffix === 'PM' && h !== 12) h += 12;
      if (suffix === 'AM' && h === 12) h = 0;

      return `${String(h).padStart(2, '0')}:${m}:00`;
    }

    const plain = t.match(/(\d{1,2}):(\d{2})/);
    if (plain) {
      return `${String(Number(plain[1])).padStart(2, '0')}:${plain[2]}:00`;
    }

    return '09:00:00';
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
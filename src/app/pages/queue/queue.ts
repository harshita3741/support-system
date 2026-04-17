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
  departmentLabel = 'Department';
  private pollInterval: any;

  constructor(
    private router: Router,
    private medicalCaseService: MedicalCaseService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const doctor = this.authService.getSession();
    this.departmentLabel = doctor?.dept || 'Department';

    this.loadQueue();
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

  this.departmentLabel = doctor?.dept || 'Department';

  this.medicalCaseService.getQueue().subscribe({
    next: (data: any[]) => {
      const dept = (doctor.dept || '').toUpperCase();
      const now = Date.now();
      const last2Hours = now - 2 * 60 * 60 * 1000;

      this.queueItems = (Array.isArray(data) ? data : [])
        .filter((c: any) => !dept || (c.department || '').toUpperCase() === dept)
        .map((c: any) => {
          const normalized = this.normalizeCase(c);
          return normalized;
        })
        .filter((c: any) => !c.timestamp || c.timestamp >= last2Hours)
        .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));

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

  private normalizeCase(c: any) {
    const patientName = c.patientName || c.name || 'Unknown Patient';
    const priority = c.priority || 'Medium';
    const status = c.status || 'OPEN';
    const department = c.department || '';
    const symptoms = c.symptoms || c.reason || 'No symptoms provided';

    const resolvedDate = this.extractDate(c);
    const resolvedTime = this.extractTime(c);
    const timestamp = this.getCaseTimestamp(c, resolvedDate, resolvedTime);

    return {
      caseId: c.caseId,
      patientName,
      age: c.age ?? null,
      gender: c.gender ?? null,
      symptoms,
      priority,
      status,
      department,
      date: resolvedDate,
      time: resolvedTime,
      timestamp,
      raw: c
    };
  }

  private extractDate(c: any): string {
    if (c.date) return c.date;
    if (c.appointmentDate) return c.appointmentDate;

    if (c.createdAt) {
      const d = new Date(c.createdAt);
      if (!isNaN(d.getTime())) return this.toYMD(d);
    }

    if (c.createdOn) {
      const d = new Date(c.createdOn);
      if (!isNaN(d.getTime())) return this.toYMD(d);
    }

    return '';
  }

  private extractTime(c: any): string {
    if (c.timeSlot) return c.timeSlot;
    if (c.time) return c.time;

    if (c.createdAt) {
      const d = new Date(c.createdAt);
      if (!isNaN(d.getTime())) return this.formatTime12Hour(d);
    }

    if (c.createdOn) {
      const d = new Date(c.createdOn);
      if (!isNaN(d.getTime())) return this.formatTime12Hour(d);
    }

    return '';
  }

  private getCaseTimestamp(c: any, date: string, time: string): number | null {
    if (c.createdAt) {
      const d = new Date(c.createdAt);
      if (!isNaN(d.getTime())) return d.getTime();
    }

    if (c.createdOn) {
      const d = new Date(c.createdOn);
      if (!isNaN(d.getTime())) return d.getTime();
    }

    if (date && time) {
      const parsed = this.parseDateTime(date, time);
      if (parsed) return parsed;
    }

    if (date) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) return d.getTime();
    }

    return null;
  }

  private parseDateTime(dateStr: string, timeStr: string): number | null {
    if (!dateStr || !timeStr) return null;

    const [time, period] = timeStr.trim().split(' ');
    if (!time || !period) {
      const fallback = new Date(`${dateStr} ${timeStr}`);
      return isNaN(fallback.getTime()) ? null : fallback.getTime();
    }

    let [hours, minutes] = time.split(':').map(Number);

    if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;

    const d = new Date(dateStr);
    d.setHours(hours || 0, minutes || 0, 0, 0);

    return isNaN(d.getTime()) ? null : d.getTime();
  }

  acceptPatient(patient: any) {
    const doctor = this.authService.getSession();
    if (!doctor) return;

    this.acceptingId = patient.caseId;

    this.medicalCaseService.acceptCase(patient.caseId, String(doctor.id)).subscribe({
      next: () => {
        this.acceptingId = null;

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
    this.queueItems = this.queueItems.filter(q => q.caseId !== patient.caseId);
    this.decliningId = null;
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

  private toYMD(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private formatTime12Hour(d: Date): string {
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const suffix = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    if (hours === 0) hours = 12;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`;
  }
}
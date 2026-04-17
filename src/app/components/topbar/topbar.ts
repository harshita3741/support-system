import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import { MedicalCaseService } from '../../services/medical-case';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css'
})
export class Topbar implements OnInit, OnDestroy {
  doctorName = '';
  doctorDept = '';
  initials = '';

  queueCount = 0;
  showNotifPanel = false;
  showToast = false;
  toastMessage = '';
  latestNotifications: any[] = [];

  private lastQueueIds = new Set<string>();
  private pollTimer: any;
  private toastTimer: any;
  private audio?: HTMLAudioElement;

  deptLabels: any = {
    CARDIO: 'Cardiologist',
    NEURO: 'Neurologist',
    ORTHO: 'Orthopedist'
  };

  constructor(
    private auth: AuthService,
    private medicalCaseService: MedicalCaseService
  ) {}

  ngOnInit() {
    const session = this.auth.getSession();
    if (session) {
      this.doctorName = session.name;
      this.doctorDept = this.deptLabels[session.dept] || session.dept;
      this.initials = session.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .replace('Dr.', '')
        .trim()
        .substring(0, 2)
        .toUpperCase();
    }

    this.createAudio();
    this.loadNotifications(true);

    this.pollTimer = setInterval(() => {
      this.loadNotifications(false);
    }, 8000);
  }

  ngOnDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  toggleNotifPanel() {
    this.showNotifPanel = !this.showNotifPanel;
  }

  loadNotifications(isFirstLoad: boolean) {
    const doctor = this.auth.getSession();
    if (!doctor || !doctor.dept) return;

    const dept = (doctor.dept || '').toUpperCase();

    this.medicalCaseService.getQueue().subscribe({
      next: (items: any[]) => {
        const queue = (Array.isArray(items) ? items : [])
          .filter((c: any) => {
            const itemDept = (c.department || '').toUpperCase();
            const status = (c.status || 'OPEN').toUpperCase();
            return itemDept === dept && (status === 'OPEN' || status === 'PENDING');
          })
          .map((c: any) => {
            const patientName = c.patientName || c.name || 'Unknown Patient';
            const caseId = String(c.caseId ?? c.id ?? patientName);
            const timeLabel = this.extractTimeLabel(c);
            const dateLabel = this.extractDateLabel(c);

            return {
              id: caseId,
              patientName,
              reason: c.symptoms || c.reason || 'Waiting in queue',
              time: timeLabel,
              date: dateLabel,
              raw: c
            };
          })
          .sort((a: any, b: any) => {
            return this.getSortTime(b.raw) - this.getSortTime(a.raw);
          });

        this.queueCount = queue.length;
        this.latestNotifications = queue.slice(0, 5);

        const currentIds = new Set<string>(queue.map((q: any) => q.id));

        if (!isFirstLoad) {
          const newItems = queue.filter((q: any) => !this.lastQueueIds.has(q.id));
          if (newItems.length > 0) {
            const latest = newItems[0];
            this.toastMessage = `New appointment: ${latest.patientName} added to ${dept} queue`;
            this.showToastPopup();
            this.playSound();
          }
        }

        this.lastQueueIds = currentIds;
      },
      error: (err) => {
        console.error('Notification load failed', err);
      }
    });
  }

  private extractTimeLabel(c: any): string {
    if (c.timeSlot) return c.timeSlot;
    if (c.time) return c.time;

    const source = c.createdAt || c.createdOn || c.timestamp || c.queuedAt;
    if (source) {
      const d = new Date(source);
      if (!isNaN(d.getTime())) {
        return this.formatTime12Hour(d);
      }
    }

    return 'Now';
  }

  private extractDateLabel(c: any): string {
    if (c.date) return c.date;
    if (c.appointmentDate) return c.appointmentDate;

    const source = c.createdAt || c.createdOn || c.timestamp || c.queuedAt;
    if (source) {
      const d = new Date(source);
      if (!isNaN(d.getTime())) {
        return this.toYMD(d);
      }
    }

    return '';
  }

  private getSortTime(c: any): number {
    const source = c.createdAt || c.createdOn || c.timestamp || c.queuedAt;
    if (source) {
      const d = new Date(source);
      if (!isNaN(d.getTime())) return d.getTime();
    }
    return Date.now();
  }

  private showToastPopup() {
    this.showToast = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);

    this.toastTimer = setTimeout(() => {
      this.showToast = false;
    }, 4500);
  }

  closeToast() {
    this.showToast = false;
  }

  private createAudio() {
    this.audio = new Audio();
    this.audio.src =
      'data:audio/wav;base64,UklGRoQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YWAAAAAA/////wAAAP///wAAAP///wAAAP///wAAAP///wAAAP///wAAAP///wAAAP///wAAAP///wAAAP///wAA';
    this.audio.load();
  }

  private playSound() {
    if (!this.audio) return;
    this.audio.currentTime = 0;
    this.audio.play().catch(() => {});
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
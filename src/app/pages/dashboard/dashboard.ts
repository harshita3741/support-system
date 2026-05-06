import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { AuthService } from "../../core/auth";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./dashboard.html",
  styleUrls: ["./dashboard.css"]
})
export class DashboardComponent implements OnInit, OnDestroy {
  name = "";
  initials = "";
  showNewMenu = false;
  showAvatarMenu = false;
  showProfileAlert = false;
  appointments: any[] = [];
  loadingAppts = true;

  // Reminder state
  showReminder = false;
  reminderAppt: any = null;
  joiningCall = false;
  private reminderTimers: any[] = [];

  constructor(private auth: AuthService, private http: HttpClient, private router: Router, private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.name = this.auth.getPatientName();
    const parts = this.name.split("@")[0].split(".");
    this.initials = parts.map((p: string) => p[0]?.toUpperCase()).join("").slice(0, 2);
    this.requestNotificationPermission();
    this.checkProfile();
    this.loadAppointments();
  }

  ngOnDestroy() {
    this.reminderTimers.forEach(t => clearTimeout(t));
  }

  checkProfile() {
    const patientId = localStorage.getItem("patientId");
    if (!patientId) { this.showProfileAlert = true; return; }
    this.http.get<any>("http://localhost:8080/patients/" + patientId).subscribe({
      next: (p) => {
        this.ngZone.run(() => {
          this.showProfileAlert = !(p.bloodGroup && p.height && p.city);
          this.cdr.detectChanges();
        });
      },
      error: () => {}
    });
  }

  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  sendNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  }

  playAlertSound() {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const beep = (startTime: number, freq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.35, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        osc.start(startTime); osc.stop(startTime + 0.35);
      };
      beep(ctx.currentTime, 880);
      beep(ctx.currentTime + 0.4, 1046);
      beep(ctx.currentTime + 0.8, 880);
    } catch {}
  }

  scheduleReminders(appointments: any[]) {
    this.reminderTimers.forEach(t => clearTimeout(t));
    this.reminderTimers = [];
    const now = Date.now();

    appointments.forEach(appt => {
      if (!appt.appointmentTime) return;
      const apptMs = new Date(appt.appointmentTime).getTime();

      // ── 15-minute-before reminder ──────────────────────────────
      const delay15 = apptMs - 15 * 60 * 1000 - now;
      if (delay15 > 0) {
        const t = setTimeout(() => {
          this.sendNotification(
            '⏰ Appointment in 15 minutes!',
            `${appt.doctorName || 'Doctor'} · ${appt.reason || appt.department || ''}`
          );
          this.ngZone.run(() => {
            this.reminderAppt = { ...appt, reminderLabel: '15 minutes' };
            this.showReminder = true;
            this.playAlertSound();
            this.cdr.detectChanges();
          });
        }, delay15);
        this.reminderTimers.push(t);
      }

      // ── At-appointment-time reminder ──────────────────────────
      const delayAtTime = apptMs - now;
      if (delayAtTime > 0) {
        const t = setTimeout(() => {
          this.sendNotification(
            '🏥 Appointment Started! Join now.',
            `${appt.doctorName || 'Doctor'} · ${appt.reason || appt.department || ''}`
          );
          this.ngZone.run(() => {
            this.reminderAppt = { ...appt, reminderLabel: 'now' };
            this.showReminder = true;
            this.playAlertSound();
            this.cdr.detectChanges();
          });
        }, delayAtTime);
        this.reminderTimers.push(t);
      }
    });
  }

  dismissReminder() {
    this.showReminder = false;
    this.reminderAppt = null;
  }

  joinCall(appt: any) {
    if (this.joiningCall) return;
    this.joiningCall = true;
    const patientName = this.auth.getPatientName();
    this.http.post<any>('http://localhost:8080/cases/create-with-type', {
      patientName,
      symptoms: appt.reason || 'Scheduled appointment',
      department: appt.department || 'GENERAL',
      consultationType: 'VIDEO'
    }).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          const caseId = res?.caseId ? String(res.caseId) : '';
          localStorage.setItem('activeCaseId', caseId);
          localStorage.setItem('consultationType', 'VIDEO');
          this.joiningCall = false;
          this.showReminder = false;
          this.cdr.detectChanges();
          this.router.navigate(['/video-call'], { queryParams: { caseId } });
        });
      },
      error: () => {
        this.ngZone.run(() => { this.joiningCall = false; this.cdr.detectChanges(); });
      }
    });
  }

  loadAppointments() {
    const patientName = this.auth.getPatientName();
    if (!patientName) { this.loadingAppts = false; return; }
    this.http.get<any[]>(`http://localhost:8080/appointments/patient/${encodeURIComponent(patientName)}`).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          const now = new Date();
          const grace = 30 * 60 * 1000; // show up to 30 min after start time
          this.appointments = (res || [])
            .filter(a => new Date(a.appointmentTime).getTime() + grace >= now.getTime() && a.status !== 'CANCELLED')
            .sort((a, b) => new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime())
            .slice(0, 5);
          this.loadingAppts = false;
          this.scheduleReminders(this.appointments);
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => { this.loadingAppts = false; this.cdr.detectChanges(); });
      }
    });
  }

  cancelAppointment(apptId: number) {
    this.http.delete(`http://localhost:8080/appointments/${apptId}`).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.appointments = this.appointments.filter(a => a.id !== apptId);
          this.cdr.detectChanges();
        });
      },
      error: () => {
        // Try soft cancel as fallback
        this.http.patch(`http://localhost:8080/appointments/${apptId}/cancel`, {}).subscribe({
          next: () => {
            this.ngZone.run(() => {
              this.appointments = this.appointments.filter(a => a.id !== apptId);
              this.cdr.detectChanges();
            });
          },
          error: () => {}
        });
      }
    });
  }

  formatApptTime(dt: string): string {
    if (!dt) return '';
    try {
      const d = new Date(dt);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        + ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch { return dt; }
  }

  /** Returns true only within 10 minutes of or after the appointment start time. */
  isJoinable(appt: any): boolean {
    if (!appt.appointmentTime) return false;
    const apptMs = new Date(appt.appointmentTime).getTime();
    const now = Date.now();
    return now >= apptMs - 10 * 60 * 1000; // allow joining 10 min before
  }

  /** Human-readable countdown shown on the disabled button. */
  timeUntil(appt: any): string {
    if (!appt.appointmentTime) return '';
    const diff = new Date(appt.appointmentTime).getTime() - Date.now();
    if (diff <= 0) return 'Now';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `in ${mins}m`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `in ${hrs}h ${rem}m` : `in ${hrs}h`;
  }

  toggleNewMenu() { this.showNewMenu = !this.showNewMenu; this.showAvatarMenu = false; }
  toggleAvatarMenu() { this.showAvatarMenu = !this.showAvatarMenu; this.showNewMenu = false; }
  closeMenus() { this.showNewMenu = false; this.showAvatarMenu = false; }

  logout() {
    localStorage.clear();
    this.router.navigate(["/"]);
  }
  dismissAlert() { this.showProfileAlert = false; }
}

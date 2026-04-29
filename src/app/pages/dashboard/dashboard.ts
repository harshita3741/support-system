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

  scheduleReminders(appointments: any[]) {
    this.reminderTimers.forEach(t => clearTimeout(t));
    this.reminderTimers = [];
    const now = Date.now();
    const FIVE_MIN = 5 * 60 * 1000;

    appointments.forEach(appt => {
      if (!appt.appointmentTime) return;
      const apptMs = new Date(appt.appointmentTime).getTime();
      const delay = apptMs - FIVE_MIN - now;
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
        const t = setTimeout(() => {
          this.sendNotification(
            '⏰ Appointment in 5 minutes!',
            `Dr. ${appt.doctorName || 'Doctor'} · ${appt.department || ''}`
          );
          this.ngZone.run(() => {
            this.reminderAppt = appt;
            this.showReminder = true;
            this.cdr.detectChanges();
          });
        }, delay);
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
          const grace = 15 * 60 * 1000; // show 15 min after start
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

  toggleNewMenu() { this.showNewMenu = !this.showNewMenu; this.showAvatarMenu = false; }
  toggleAvatarMenu() { this.showAvatarMenu = !this.showAvatarMenu; this.showNewMenu = false; }
  closeMenus() { this.showNewMenu = false; this.showAvatarMenu = false; }

  logout() {
    localStorage.clear();
    this.router.navigate(["/"]);
  }
  dismissAlert() { this.showProfileAlert = false; }
}

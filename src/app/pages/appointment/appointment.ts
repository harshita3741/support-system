import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-appointment',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './appointment.html',
  styleUrls: ['./appointment.css']
})
export class AppointmentComponent implements OnInit, OnDestroy {

  doctors: any[] = [];
  slots: any[] = [];
  selectedDoctor = 0;
  selectedSlot = '';
  initials = '';
  showAvatarMenu = false;
  slotsLoading = false;
  showToast = false;
  toastMsg = '';

  // ─── Reminder popup ───────────────────────────────────────────
  showReminderPopup = false;
  reminderPopupMsg = '';
  private reminderTimeouts: any[] = [];

  // ─── Calendar ─────────────────────────────────────────────────
  today = new Date();
  currentYear  = this.today.getFullYear();
  currentMonth = this.today.getMonth();      // 0-based
  selectedDay  = this.today.getDate();       // default = today

  get monthLabel(): string {
    return new Date(this.currentYear, this.currentMonth, 1)
      .toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }

  get todayDate(): number { return this.today.getDate(); }
  get todayMonth(): number { return this.today.getMonth(); }
  get todayYear(): number { return this.today.getFullYear(); }

  /** Blank cells + day numbers for the current month grid */
  get calDays(): (number | null)[] {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);       // blank offsets
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);       // actual days
    return cells;
  }

  isToday(day: number | null): boolean {
    return day !== null
      && day === this.todayDate
      && this.currentMonth === this.todayMonth
      && this.currentYear  === this.todayYear;
  }

  prevMonth() {
    if (this.currentMonth === 0) { this.currentMonth = 11; this.currentYear--; }
    else this.currentMonth--;
    this.selectedDay = 1;
  }

  nextMonth() {
    if (this.currentMonth === 11) { this.currentMonth = 0; this.currentYear++; }
    else this.currentMonth++;
    this.selectedDay = 1;
  }

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private router: Router
  ) {
    const name = localStorage.getItem('patientName') || '';
    this.initials = name.split('@')[0].split('.')
      .map((p: string) => p[0]?.toUpperCase()).join('').slice(0, 2) || 'PT';
  }

  toggleAvatarMenu() { this.showAvatarMenu = !this.showAvatarMenu; }
  closeMenus() { this.showAvatarMenu = false; }
  logout() { localStorage.clear(); this.router.navigate(['/']); }

  ngOnInit() {
    this.loadDoctors();
    this.loadExistingReminders();
  }

  ngOnDestroy() {
    this.reminderTimeouts.forEach(t => clearTimeout(t));
  }

  // ─── Reminder at appointment time ─────────────────────────────

  loadExistingReminders() {
    const patientName = localStorage.getItem('patientName') || '';
    if (!patientName) return;
    this.http.get<any[]>(`http://localhost:8080/appointments/patient/${patientName}`).subscribe({
      next: (appts) => {
        this.ngZone.run(() => {
          (appts || []).forEach(a => {
            if (a.appointmentTime) {
              this.scheduleApptReminder(a.doctorName, a.appointmentTime);
            }
          });
        });
      },
      error: () => {}
    });
  }

  scheduleApptReminder(doctorName: string, appointmentTime: string) {
    const apptMs = new Date(appointmentTime).getTime();
    const nowMs = Date.now();
    const diffMs = apptMs - nowMs;

    // Only schedule if appointment is in the future and within 24 hours
    if (diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000) {
      const t = setTimeout(() => {
        this.ngZone.run(() => {
          const timeStr = new Date(appointmentTime).toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit', hour12: true
          });
          this.reminderPopupMsg = `Your appointment with ${doctorName} is right now (${timeStr})`;
          this.showReminderPopup = true;
          this.cdr.detectChanges();
          this.playAlertSound();

          // Also fire browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('⏰ CareAI — Appointment Now!', {
              body: `${doctorName} · ${timeStr}`,
              icon: '/favicon.ico'
            });
          }
        });
      }, diffMs);
      this.reminderTimeouts.push(t);
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
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.35, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        osc.start(startTime);
        osc.stop(startTime + 0.35);
      };
      beep(ctx.currentTime,        880);
      beep(ctx.currentTime + 0.4,  1046);
      beep(ctx.currentTime + 0.8,  880);
    } catch {}
  }

  dismissReminder() {
    this.showReminderPopup = false;
    this.cdr.detectChanges();
  }

  loadDoctors() {
    this.http.get<any[]>('http://localhost:8080/doctors').subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.doctors = (Array.isArray(res) ? res : []).map(d => ({
            id:       d.doctorId,
            initials: (d.name || '').split(' ').map((w: string) => w[0] || '').join('').substring(0, 2).toUpperCase(),
            name:     d.name,
            spec:     d.specialty || d.department || '',
            color:    this.getColor(d.specialty || d.department || '')
          }));
          this.cdr.detectChanges();

          if (this.doctors.length > 0) {
            this.selectedDoctor = 0;
            this.loadSlots(0);
          }
        });
      },
      error: (err) => {
        console.error('Failed to load doctors:', err);
        // Use fallback hardcoded doctors so UI still works
        this.ngZone.run(() => {
          this.doctors = [
            { id: 1, initials: 'DS', name: 'Dr. Smith',   spec: 'CARDIO',  color: '#1d9e75' },
            { id: 2, initials: 'DA', name: 'Dr. Adams',   spec: 'NEURO',   color: '#6c63ff' },
            { id: 3, initials: 'DL', name: 'Dr. Lee',     spec: 'ORTHO',   color: '#d85a30' },
            { id: 4, initials: 'DJ', name: 'Dr. Johnson', spec: 'GENERAL', color: '#0891b2' }
          ];
          this.cdr.detectChanges();
          this.loadSlots(0);
        });
      }
    });
  }

  loadSlots(index: number) {
    if (!this.doctors[index]) return;
    const doctorId = this.doctors[index].id;
    const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(this.selectedDay).padStart(2, '0')}`;
    this.slotsLoading = true;
    this.slots = [];
    this.cdr.detectChanges();

    const defaults = this.generateDefaultSlots();

    this.http.get<string[]>(`http://localhost:8080/appointments/booked/${doctorId}?date=${dateStr}`).subscribe({
      next: (booked) => {
        this.ngZone.run(() => {
          const bookedSet = new Set<string>((booked || []).map((t: string) => t.toUpperCase().trim()));
          this.slots = defaults.map(s => ({ ...s, taken: bookedSet.has(s.time.toUpperCase()) }));
          this.selectedSlot = '';
          this.slotsLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.slots = defaults;
          this.selectedSlot = '';
          this.slotsLoading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  generateDefaultSlots(): any[] {
    const times = [
      '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
      '11:00 AM', '11:30 AM', '12:00 PM',
      '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
      '04:00 PM', '04:30 PM', '05:00 PM'
    ];

    // Determine if the selected date is today
    const isToday =
      this.selectedDay === this.todayDate &&
      this.currentMonth === this.todayMonth &&
      this.currentYear === this.todayYear;

    const now = new Date();

    return times.map((time, i) => {
      let pastTime = false;
      if (isToday) {
        // Parse slot time to compare with current time
        try {
          const [hm, ampm] = time.split(' ');
          let [hh, mm] = hm.split(':').map(Number);
          if (ampm === 'PM' && hh !== 12) hh += 12;
          if (ampm === 'AM' && hh === 12) hh = 0;
          const slotDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm);
          pastTime = slotDate <= now;
        } catch { pastTime = false; }
      }
      return { id: i + 1, time, raw: time, taken: false, past: pastTime };
    });
  }

  selectDoctor(i: number) {
    this.selectedDoctor = i;
    this.selectedSlot = '';
    this.loadSlots(i);  // loads for current selected date
  }

  selectSlot(slot: any) {
    if (!slot.taken && !slot.past) {
      this.selectedSlot = slot.time;
      this.cdr.detectChanges();
    }
  }

  selectDay(day: number | null) {
    if (day) {
      this.selectedDay = day;
      this.selectedSlot = '';
      // Reload slots for new date
      this.loadSlots(this.selectedDoctor);
      this.cdr.detectChanges();
    }
  }

  confirm() {
    if (!this.selectedSlot) { alert('Please select a time slot.'); return; }
    if (!this.selectedDay)  { alert('Please select a date.'); return; }

    const selected = this.slots.find(s => s.time === this.selectedSlot);
    if (!selected) return;

    const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(this.selectedDay).padStart(2, '0')}`;
    const doc = this.doctors[this.selectedDoctor];

    // Parse time string to LocalDateTime format: "09:00 AM" → "2026-04-22T09:00:00"
    const parseTime = (t: string, d: string): string => {
      try {
        const [hm, ampm] = t.split(' ');
        let [hh, mm] = hm.split(':').map(Number);
        if (ampm === 'PM' && hh !== 12) hh += 12;
        if (ampm === 'AM' && hh === 12) hh = 0;
        return `${d}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`;
      } catch { return `${d}T09:00:00`; }
    };

    const payload = {
      patientName:     localStorage.getItem('patientName') || 'Patient',
      patientId:       localStorage.getItem('patientId') || '',
      doctorId:        doc?.id,
      doctorName:      doc?.name || '',
      department:      doc?.spec || '',
      reason:          'Routine appointment - ' + (doc?.spec || ''),
      appointmentTime: parseTime(selected.time, dateStr)
    };

    this.http.post('http://localhost:8080/appointments/book', payload).subscribe({
      next: () => {
        this.ngZone.run(() => {
          selected.taken = true;
          this.selectedSlot = '';
          this.cdr.detectChanges();
          this.showBookingConfirmation(
            this.doctors[this.selectedDoctor]?.name,
            dateStr,
            selected.time
          );
        });
      },
      error: () => {
        // Even if backend fails, show confirmation for demo purposes
        this.ngZone.run(() => {
          selected.taken = true;
          this.selectedSlot = '';
          this.cdr.detectChanges();
          this.showBookingConfirmation(
            this.doctors[this.selectedDoctor]?.name,
            dateStr,
            selected.time
          );
        });
      }
    });
  }

  showBookingConfirmation(doctorName: string, date: string, time: string) {
    // Parse "09:00 AM" + "2026-04-22" → full ISO for reminder
    try {
      const [hm, ampm] = time.split(' ');
      let [hh, mm] = hm.split(':').map(Number);
      if (ampm === 'PM' && hh !== 12) hh += 12;
      if (ampm === 'AM' && hh === 12) hh = 0;
      const isoStr = `${date}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`;
      this.scheduleApptReminder(doctorName, isoStr);
    } catch {}

    this.toastMsg = `Appointment confirmed with ${doctorName} on ${date} at ${time}`;
    this.showToast = true;
    this.cdr.detectChanges();
    setTimeout(() => { this.showToast = false; this.cdr.detectChanges(); }, 5000);

    // Browser push notification
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('CareAI — Appointment Confirmed', {
          body: `${doctorName} · ${date} at ${time}`,
          icon: '/favicon.ico'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') {
            new Notification('CareAI — Appointment Confirmed', {
              body: `${doctorName} · ${date} at ${time}`,
              icon: '/favicon.ico'
            });
          }
        });
      }
    }
  }

  formatTime(slotTime: string): string {
    try {
      const date = new Date(slotTime);
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch { return slotTime; }
  }

  getColor(specialty: string): string {
    const map: any = {
      'CARDIO': '#1d9e75', 'NEURO': '#6c63ff',
      'ORTHO': '#d85a30',  'GENERAL': '#0891b2'
    };
    return map[(specialty || '').toUpperCase()] || '#6c63ff';
  }
}

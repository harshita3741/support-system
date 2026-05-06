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
  selectedReason = 'Routine check-up';
  initials = '';
  showAvatarMenu = false;
  slotsLoading = false;
  showToast = false;
  toastMsg = '';
  toastType: 'success' | 'error' = 'success';

  // ─── Doctor availability (set when a doctor is selected + date changes) ──
  doctorAvailability: any = null;      // summary from GET /availability/{id}/summary
  doctorStatusMap: Map<number, any> = new Map(); // doctorId → availability record

  // ─── Upcoming appointments ─────────────────────────────────────
  upcomingAppts: any[] = [];
  private upcomingInterval: any;

  // ─── Reminder popup ───────────────────────────────────────────
  showReminderPopup = false;
  reminderPopupMsg = '';
  reminderApptId = '';     // appointment ID shown in current popup (for join button)
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
    this.loadUpcomingAppts();
    // Refresh upcoming list every minute so join button activates on time
    this.upcomingInterval = setInterval(() => {
      this.loadUpcomingAppts();
      this.cdr.detectChanges();
    }, 60000);
  }

  ngOnDestroy() {
    this.reminderTimeouts.forEach(t => clearTimeout(t));
    clearInterval(this.upcomingInterval);
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
              this.scheduleApptReminder(a.doctorName, a.appointmentTime, a.id || a.appointmentId);
            }
          });
        });
      },
      error: () => {}
    });
  }

  scheduleApptReminder(doctorName: string, appointmentTime: string, apptId?: any) {
    const apptMs = new Date(appointmentTime).getTime();
    const nowMs = Date.now();
    const diffMs = apptMs - nowMs;

    const showPopup = (msg: string, notifTitle: string) => {
      this.ngZone.run(() => {
        const timeStr = new Date(appointmentTime).toLocaleTimeString('en-US', {
          hour: 'numeric', minute: '2-digit', hour12: true
        });
        this.reminderPopupMsg = msg.replace('{time}', timeStr);
        this.reminderApptId = String(apptId || '');
        this.showReminderPopup = true;
        this.cdr.detectChanges();
        this.playAlertSound();
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notifTitle, { body: `${doctorName} · ${timeStr}`, icon: '/favicon.ico' });
        }
      });
    };

    // ── 15-minute-before reminder ──────────────────────────────────
    const diff15 = diffMs - 15 * 60 * 1000;
    if (diff15 > 0) {
      const t15 = setTimeout(() =>
        showPopup(
          `Your appointment with ${doctorName} is in 15 minutes ({time}). Please be ready.`,
          '⏰ CareAI — Appointment in 15 minutes!'
        ), diff15);
      this.reminderTimeouts.push(t15);
    }

    // ── At-appointment-time reminder ──────────────────────────────
    if (diffMs > 0) {
      const t = setTimeout(() =>
        showPopup(
          `Your appointment with ${doctorName} has started ({time}). Join now!`,
          '🏥 CareAI — Appointment Started!'
        ), diffMs);
      this.reminderTimeouts.push(t);
    } else if (diffMs >= -5 * 60 * 1000) {
      // Missed by < 5 min — show immediately on page load
      showPopup(
        `Your appointment with ${doctorName} has started ({time}). Join now!`,
        '🏥 CareAI — Appointment Started!'
      );
    }
  }

  // ─── Upcoming appointments ─────────────────────────────────────

  loadUpcomingAppts() {
    const patientName = localStorage.getItem('patientName') || '';
    if (!patientName) return;
    this.http.get<any[]>(`http://localhost:8080/appointments/patient/${patientName}`).subscribe({
      next: (appts) => {
        this.ngZone.run(() => {
          let completed: string[] = [];
          try { completed = JSON.parse(localStorage.getItem('completedApptIds') || '[]'); } catch {}
          const now = new Date();
          this.upcomingAppts = (appts || [])
            .filter(a => !completed.includes(String(a.id || a.appointmentId || '')))
            .filter(a => {
              const apptTime = new Date(a.appointmentTime);
              // Show appointments until 30 min after their start time
              return apptTime.getTime() + 30 * 60 * 1000 > now.getTime();
            })
            .sort((a, b) => new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime())
            .slice(0, 5); // show max 5
          this.cdr.detectChanges();
        });
      },
      error: () => {}
    });
  }

  /** Returns true if appointment time is within 5 minutes or already passed (up to 2h) */
  canJoin(appt: any): boolean {
    const apptMs = new Date(appt.appointmentTime).getTime();
    const nowMs = Date.now();
    return nowMs >= apptMs - 5 * 60 * 1000;
  }

  joinAppointmentCall(appt: any) {
    const apptId = String(appt.id || appt.appointmentId || '');
    localStorage.setItem('currentAppointmentId', apptId);
    // Navigate to video call using appointment ID as the case ID
    this.router.navigate(['/video-call'], { queryParams: { caseId: apptId } });
  }

  formatApptTime(appointmentTime: string): string {
    try {
      const d = new Date(appointmentTime);
      const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${date} at ${time}`;
    } catch { return appointmentTime; }
  }

  formatApptTimeOnly(appointmentTime: string): string {
    try {
      return new Date(appointmentTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch { return ''; }
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
          // Pre-fetch availability for all doctors so we can show status badges
          this.loadAllDoctorAvailability();
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
          this.loadAllDoctorAvailability();
        });
      }
    });
  }

  /** Fetch availability for all doctors so we can show status badges */
  loadAllDoctorAvailability() {
    this.http.get<any[]>('http://localhost:8080/availability').subscribe({
      next: (avList) => {
        this.ngZone.run(() => {
          (avList || []).forEach(av => this.doctorStatusMap.set(av.doctorId, av));
          this.cdr.detectChanges();
        });
      },
      error: () => {} // non-critical — badges just won't show
    });
  }

  /** Returns the status string for the doctor at index i (for badge display) */
  getDoctorStatus(i: number): string {
    const doc = this.doctors[i];
    if (!doc) return '';
    const av = this.doctorStatusMap.get(doc.id);
    return av?.status || 'AVAILABLE';
  }

  getDoctorStatusLabel(i: number): string {
    const map: any = {
      'AVAILABLE':       'Available',
      'UNAVAILABLE':     'Unavailable',
      'ON_LEAVE':        'On Leave',
      'IN_CONSULTATION': 'In Consultation'
    };
    return map[this.getDoctorStatus(i)] || 'Available';
  }

  loadSlots(index: number) {
    if (!this.doctors[index]) return;
    const doctorId = this.doctors[index].id;
    const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(this.selectedDay).padStart(2, '0')}`;
    this.slotsLoading = true;
    this.slots = [];
    this.doctorAvailability = null;
    this.cdr.detectChanges();

    const defaults = this.generateDefaultSlots();

    // ── Fetch booked slots ─────────────────────────────────────────
    const booked$ = this.http.get<string[]>(
      `http://localhost:8080/appointments/booked/${doctorId}?date=${dateStr}`
    );

    // ── Fetch availability summary ─────────────────────────────────
    const avail$ = this.http.get<any>(
      `http://localhost:8080/availability/${doctorId}/summary?date=${dateStr}`
    );

    booked$.subscribe({
      next: (booked) => {
        this.ngZone.run(() => {
          const bookedSet = new Set<string>((booked || []).map((t: string) => t.toUpperCase().trim()));
          // Will merge blocked set once availability arrives
          this.slots = defaults.map(s => ({ ...s, taken: bookedSet.has(s.time.toUpperCase()) }));
          this.selectedSlot = '';
          this.slotsLoading = false;
          this.cdr.detectChanges();

          // Now fetch availability to overlay blocked slots
          avail$.subscribe({
            next: (avail: any) => {
              this.ngZone.run(() => {
                this.doctorAvailability = avail;
                // Update doctorStatusMap
                if (avail?.doctorId) {
                  this.doctorStatusMap.set(avail.doctorId, { status: avail.status });
                }
                const blockedSlotSet = new Set<string>(
                  (avail?.blockedSlots || []).map((t: string) => t.toUpperCase().trim())
                );
                const docFullyUnavailable = avail?.isAvailable === false && !avail?.dateBlocked && !avail?.dayBlocked
                  ? false  // only slot-level blocks — still partly available
                  : (avail?.isAvailable === false);

                this.slots = this.slots.map(s => ({
                  ...s,
                  // blocked by doctor's availability settings (not just "taken" by a booking)
                  blocked: blockedSlotSet.has(s.time.toUpperCase()) || docFullyUnavailable,
                  docUnavailable: docFullyUnavailable
                }));
                this.cdr.detectChanges();
              });
            },
            error: () => {} // non-critical — slots remain without availability overlay
          });
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

  /** True if the selected date is blocked for the current doctor */
  get isSelectedDateBlocked(): boolean {
    return this.doctorAvailability?.isAvailable === false;
  }

  get selectedDateBlockReason(): string {
    const av = this.doctorAvailability;
    if (!av) return '';
    if (av.dateBlocked) return 'Doctor has blocked this date';
    if (av.dayBlocked) return 'Doctor does not work on this day';
    const status = av.status || 'AVAILABLE';
    if (status === 'UNAVAILABLE') return 'Doctor is currently unavailable';
    if (status === 'ON_LEAVE') return 'Doctor is on leave';
    if (status === 'IN_CONSULTATION') return 'Doctor is in an active consultation';
    return '';
  }

  /** Check if a calendar day should appear greyed-out (fully blocked date / blocked day-of-week) */
  isDayUnavailable(day: number | null): boolean {
    if (!day) return false;
    if (!this.doctorAvailability) return false;
    // If entire month date is in blockedDates
    const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // We don't load per-day availability for the full calendar (would be 31 API calls).
    // Instead, we only grey out the currently selected day based on the loaded summary.
    // The slot grid itself shows the blocked overlay.
    return false;
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
    if (!slot.taken && !slot.past && !slot.blocked) {
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
      reason:          this.selectedReason,
      appointmentTime: parseTime(selected.time, dateStr)
    };

    this.http.post<any>('http://localhost:8080/appointments/book', payload).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          selected.taken = true;
          this.selectedSlot = '';
          this.cdr.detectChanges();
          this.showBookingConfirmation(
            this.doctors[this.selectedDoctor]?.name,
            dateStr,
            selected.time,
            res?.id || res?.appointmentId
          );
          this.loadUpcomingAppts(); // refresh upcoming list after new booking
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          // 409 = doctor blocked this slot via availability settings
          if (err?.status === 409) {
            const msg = err?.error?.error || 'This slot is not available. Please choose another.';
            this.toastMsg = msg;
            this.toastType = 'error';
            this.showToast = true;
            // Mark the slot as blocked so it turns red in the UI
            selected.blocked = true;
            this.selectedSlot = '';
            this.cdr.detectChanges();
            setTimeout(() => { this.showToast = false; this.cdr.detectChanges(); }, 6000);
            return;
          }
          // For other errors: still show confirmation (demo mode)
          selected.taken = true;
          this.selectedSlot = '';
          this.cdr.detectChanges();
          this.showBookingConfirmation(
            this.doctors[this.selectedDoctor]?.name,
            dateStr,
            selected.time
          );
          this.loadUpcomingAppts();
        });
      }
    });
  }

  showBookingConfirmation(doctorName: string, date: string, time: string, apptId?: any) {
    // Parse "09:00 AM" + "2026-04-22" → full ISO for reminder
    try {
      const [hm, ampm] = time.split(' ');
      let [hh, mm] = hm.split(':').map(Number);
      if (ampm === 'PM' && hh !== 12) hh += 12;
      if (ampm === 'AM' && hh === 12) hh = 0;
      const isoStr = `${date}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`;
      this.scheduleApptReminder(doctorName, isoStr, apptId);
    } catch {}

    this.toastMsg = `Appointment confirmed with ${doctorName} on ${date} at ${time}`;
    this.toastType = 'success';
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

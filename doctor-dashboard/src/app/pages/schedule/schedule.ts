import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AppointmentService, Appointment } from '../../services/appointment.service';
import { AuthService } from '../../services/auth';

export interface CalendarEvent {
  id: number;
  title: string;
  type: 'video' | 'hospital' | 'home' | 'audio' | 'in-person' | 'break' | 'meeting' | 'leave';
  startHour: number;
  endHour: number;
  patientName?: string;
  department?: string;
  reason?: string;
  date?: string;
  appointmentTime?: string;   // full ISO string
  source?: 'backend' | 'leave';
  appointmentId?: number;
}

export interface DayColumn {
  name: string; short: string; date: number; fullDate: string;
  isToday: boolean; isSelected: boolean; events: CalendarEvent[];
}

export interface MonthCell {
  date: Date; day: number; fullDate: string; isCurrentMonth: boolean;
  isToday: boolean; isSelected: boolean; eventCount: number;
}

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './schedule.html',
  styleUrls: ['./schedule.css']
})
export class Schedule implements OnInit, OnDestroy {
  viewMode: 'week' | 'month' = 'week';
  weekLabel = ''; weekNumber = ''; monthLabel = '';

  currentDate = new Date();
  selectedDate = '';

  startHour = 8; endHour = 18; rowHeight = 64;
  hours: string[] = []; hourCount = 0;

  currentTimeLabel = ''; currentTimePct = 0; showTimeLine = false;

  private timerId: any;
  private pollTimer: any;
  private reminderTimers: any[] = [];

  days: DayColumn[] = [];
  monthDays: MonthCell[] = [];
  backendAppointments: CalendarEvent[] = [];
  leaveBlocks: CalendarEvent[] = [];
  allEvents: CalendarEvent[] = [];

  // Modal
  selectedEvent: CalendarEvent | null = null;
  showModal = false;

  // Reminder popup
  reminderEvent: CalendarEvent | null = null;
  showReminder = false;

  // Join call state
  joiningCall = false;

  private baseUrl = 'http://192.168.1.76:8080';

  typeConfig: Record<string, { icon: string; bg: string; color: string; border: string }> = {
    video:       { icon: '📹', bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
    hospital:    { icon: '🏥', bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
    home:        { icon: '🏠', bg: '#fef9c3', color: '#854d0e', border: '#fde68a' },
    audio:       { icon: '📞', bg: '#fce7f3', color: '#9d174d', border: '#f9a8d4' },
    'in-person': { icon: '👤', bg: '#ede9fe', color: '#5b21b6', border: '#c4b5fd' },
    break:       { icon: '☕', bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
    meeting:     { icon: '📋', bg: '#f0fdf4', color: '#166534', border: '#86efac' },
    leave:       { icon: '🚫', bg: '#fff7ed', color: '#9a3412', border: '#fdba74' }
  };

  constructor(
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.buildHours();
    this.selectedDate = this.toYMD(new Date());
    this.requestNotificationPermission();
    this.loadAppointments();
    this.refreshView();
    this.updateCurrentTime();
    this.timerId = setInterval(() => this.updateCurrentTime(), 60000);
    this.pollTimer = setInterval(() => this.loadAppointments(), 30000);
  }

  ngOnDestroy() {
    if (this.timerId) clearInterval(this.timerId);
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.reminderTimers.forEach(t => clearTimeout(t));
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

  // ── Schedule reminders ────────────────────────────────────────

  scheduleReminders(events: CalendarEvent[]) {
    // Clear existing reminder timers
    this.reminderTimers.forEach(t => clearTimeout(t));
    this.reminderTimers = [];

    const now = Date.now();
    const FIVE_MIN = 5 * 60 * 1000;

    events.forEach(event => {
      if (!event.appointmentTime || event.source !== 'backend') return;
      const apptMs = new Date(event.appointmentTime).getTime();
      const reminderMs = apptMs - FIVE_MIN;
      const delay = reminderMs - now;

      if (delay > 0 && delay < 24 * 60 * 60 * 1000) { // within next 24h
        const t = setTimeout(() => {
          this.sendNotification(
            '⏰ Appointment in 5 minutes',
            `Patient: ${event.patientName || event.title} — ${event.department || ''}`
          );
          this.reminderEvent = event;
          this.showReminder = true;
        }, delay);
        this.reminderTimers.push(t);
      }
    });
  }

  dismissReminder() { this.showReminder = false; this.reminderEvent = null; }

  // ── Load appointments ─────────────────────────────────────────

  loadAppointments() {
    const doctorId = this.authService.getDoctorId();
    if (!doctorId) return;

    this.appointmentService.getAppointmentsByDoctor(Number(doctorId)).subscribe({
      next: (appointments: Appointment[]) => {
        this.backendAppointments = appointments.map((appt: Appointment, index: number) => {
          const isoTime = appt.appointmentTime || '';
          const start = this.isoToHour(isoTime);
          const dateStr = isoTime ? this.toYMD(new Date(isoTime)) : this.selectedDate;
          return {
            id: appt.id ?? index + 1,
            appointmentId: appt.id,
            title: appt.patientName || 'Patient Appointment',
            type: 'in-person' as CalendarEvent['type'],
            startHour: start,
            endHour: start + 0.5,
            date: dateStr,
            appointmentTime: isoTime,
            patientName: appt.patientName,
            department: appt.department,
            reason: appt.reason,
            source: 'backend'
          };
        });
        this.mergeAllEvents();
        this.scheduleReminders(this.backendAppointments);
      },
      error: (err: any) => console.error('Failed to load appointments', err)
    });
  }

  // ── Appointment modal ─────────────────────────────────────────

  openAppointmentModal(event: CalendarEvent, mouseEvent: MouseEvent) {
    mouseEvent.stopPropagation();
    if (event.source === 'leave') return;
    this.selectedEvent = event;
    this.showModal = true;
  }

  closeModal() { this.showModal = false; this.selectedEvent = null; }

  formatApptDateTime(iso: string): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        + ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  }

  // ── Join Call ─────────────────────────────────────────────────
  // Creates a VIDEO case for the appointment patient and opens incoming-call

  joinCall(event: CalendarEvent) {
    if (this.joiningCall) return;
    this.joiningCall = true;
    const doctor = this.authService.getDoctorSession?.() || { id: null, name: 'Doctor', dept: '' };

    this.http.post<any>(`${this.baseUrl}/cases/create-with-type`, {
      patientName: event.patientName || event.title,
      symptoms: event.reason || 'Scheduled appointment',
      department: event.department || (doctor as any).dept || 'GENERAL',
      consultationType: 'VIDEO'
    }).subscribe({
      next: (res) => {
        const caseId = res?.caseId ? String(res.caseId) : '';
        const patientData = {
          name: event.patientName || event.title,
          patientName: event.patientName || event.title,
          dept: event.department || (doctor as any).dept || 'GENERAL',
          department: event.department || (doctor as any).dept || 'GENERAL',
          symptoms: event.reason || 'Scheduled appointment',
          reason: event.reason || 'Scheduled appointment',
          priority: 'Scheduled',
          consultationType: 'VIDEO',
          caseId
        };
        localStorage.setItem('activePatient', JSON.stringify(patientData));
        this.joiningCall = false;
        this.showModal = false;
        this.showReminder = false;
        this.router.navigate(['/incoming-call']);
      },
      error: () => {
        this.joiningCall = false;
        // Fallback: navigate to queue
        this.router.navigate(['/queue']);
      }
    });
  }

  // ── Leave blocks ──────────────────────────────────────────────

  private mergeAllEvents() {
    this.allEvents = [...this.backendAppointments, ...this.leaveBlocks];
    this.refreshView();
  }

  addLeave(fullDate: string) {
    const reason = window.prompt('Enter Leave/Block Reason', 'Doctor Unavailable');
    if (!reason) return;
    const startStr = window.prompt('Start Time (HH:MM)', '13:00');
    const endStr = window.prompt('End Time (HH:MM)', '14:00');
    if (!startStr || !endStr) return;
    const startHour = this.parseTimeToDecimal(startStr);
    const endHour = this.parseTimeToDecimal(endStr);
    if (isNaN(startHour) || isNaN(endHour)) { alert('Invalid time format. Use HH:MM'); return; }
    if (startHour >= endHour) { alert('End time must be greater than start time'); return; }
    this.leaveBlocks.push({ id: Date.now(), title: reason, type: 'leave', startHour, endHour, date: fullDate, source: 'leave' });
    this.mergeAllEvents();
  }

  deleteEvent(id: number, mouseEvent: MouseEvent) {
    mouseEvent.stopPropagation();
    const target = this.allEvents.find(e => e.id === id);
    if (!target) return;
    if (target.source === 'backend') { alert('Patient appointments come from backend. Cancel them from patient portal.'); return; }
    if (confirm('Remove this leave block?')) {
      this.leaveBlocks = this.leaveBlocks.filter(e => e.id !== id);
      this.mergeAllEvents();
    }
  }

  canDeleteEvent(event: CalendarEvent): boolean { return event.source === 'leave'; }

  // ── Calendar helpers ──────────────────────────────────────────

  isoToHour(iso: string): number {
    if (!iso) return this.startHour;
    try {
      const d = new Date(iso);
      return d.getHours() + d.getMinutes() / 60;
    } catch { return this.startHour; }
  }

  parseTimeToDecimal(time: string): number {
    const [h, m] = time.split(':').map(Number);
    if ([h, m].some(v => isNaN(v))) return NaN;
    if (h < 0 || h > 23 || m < 0 || m > 59) return NaN;
    return h + m / 60;
  }

  buildHours() {
    this.hours = [];
    this.hourCount = this.endHour - this.startHour;
    for (let h = this.startHour; h <= this.endHour; h++) {
      const suffix = h < 12 ? 'AM' : 'PM';
      const display = h <= 12 ? h : h - 12;
      this.hours.push(`${display === 0 ? 12 : display} ${suffix}`);
    }
  }

  refreshView() {
    if (this.viewMode === 'week') this.buildWeek(this.currentDate);
    else this.buildMonth(this.currentDate);
  }

  buildWeek(baseDate: Date) {
    const today = new Date();
    const dow = baseDate.getDay();
    const monday = new Date(baseDate);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(baseDate.getDate() - (dow === 0 ? 6 : dow - 1));
    const end = new Date(monday); end.setDate(monday.getDate() + 6);
    this.weekLabel = `${this.fmt(monday)} – ${this.fmt(end)}`;
    this.weekNumber = `W${this.getWeekNumber(monday)}`;
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const fullNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    this.days = dayNames.map((short, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      const fullDate = this.toYMD(d);
      return { name: fullNames[i], short, date: d.getDate(), fullDate,
        isToday: this.isSameDay(d, today), isSelected: this.selectedDate === fullDate,
        events: this.allEvents.filter(e => e.date === fullDate).sort((a, b) => a.startHour - b.startHour) };
    });
  }

  buildMonth(baseDate: Date) {
    const today = new Date();
    const year = baseDate.getFullYear(); const month = baseDate.getMonth();
    this.monthLabel = baseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const firstDay = new Date(year, month, 1);
    const firstGridDay = new Date(firstDay);
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    firstGridDay.setDate(firstDay.getDate() - startDay);
    this.monthDays = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(firstGridDay); d.setDate(firstGridDay.getDate() + i);
      const fullDate = this.toYMD(d);
      this.monthDays.push({ date: d, day: d.getDate(), fullDate, isCurrentMonth: d.getMonth() === month,
        isToday: this.isSameDay(d, today), isSelected: this.selectedDate === fullDate,
        eventCount: this.allEvents.filter(e => e.date === fullDate).length });
    }
  }

  selectDay(fullDate: string) {
    this.selectedDate = fullDate;
    if (this.viewMode === 'week') {
      this.days = this.days.map(day => ({ ...day, isSelected: day.fullDate === fullDate,
        events: this.allEvents.filter(e => e.date === day.fullDate).sort((a, b) => a.startHour - b.startHour) }));
    } else {
      this.monthDays = this.monthDays.map(day => ({ ...day, isSelected: day.fullDate === fullDate }));
    }
  }

  setView(v: 'week' | 'month') { this.viewMode = v; this.refreshView(); this.updateCurrentTime(); }

  prevWeek() {
    if (this.viewMode === 'week') { this.currentDate = new Date(this.currentDate); this.currentDate.setDate(this.currentDate.getDate() - 7); }
    else { this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1); }
    this.refreshView();
  }

  nextWeek() {
    if (this.viewMode === 'week') { this.currentDate = new Date(this.currentDate); this.currentDate.setDate(this.currentDate.getDate() + 7); }
    else { this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1); }
    this.refreshView();
  }

  updateCurrentTime() {
    const now = new Date();
    const h = now.getHours() + now.getMinutes() / 60;
    this.showTimeLine = this.viewMode === 'week' && h >= this.startHour && h <= this.endHour;
    this.currentTimePct = ((h - this.startHour) / this.hourCount) * 100;
    this.currentTimeLabel = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  getEventTop(event: CalendarEvent): string { return `${(event.startHour - this.startHour) * this.rowHeight}px`; }
  getEventHeight(event: CalendarEvent): string { return `${Math.max((event.endHour - event.startHour) * this.rowHeight - 8, 42)}px`; }
  getEventBg(type: string): string { return this.typeConfig[type]?.bg || '#f3f4f6'; }
  getEventColor(type: string): string { return this.typeConfig[type]?.color || '#374151'; }
  getEventBorder(type: string): string { return this.typeConfig[type]?.border || '#e5e7eb'; }
  getEventIcon(type: string): string { return this.typeConfig[type]?.icon || '📅'; }

  formatHour(h: number): string {
    const hour = Math.floor(h); const min = h % 1 === 0.5 ? '30' : '00';
    const suffix = hour < 12 ? 'AM' : 'PM';
    const display = hour <= 12 ? (hour === 0 ? 12 : hour) : hour - 12;
    return `${display}:${min} ${suffix}`;
  }

  private fmt(d: Date): string { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  private toYMD(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  private isSameDay(a: Date, b: Date): boolean { return a.getDate()===b.getDate() && a.getMonth()===b.getMonth() && a.getFullYear()===b.getFullYear(); }
  private getWeekNumber(date: Date): number {
    const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = temp.getUTCDay() || 7;
    temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
    return Math.ceil((((temp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}

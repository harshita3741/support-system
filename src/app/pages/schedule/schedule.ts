import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppointmentService, Appointment } from '../../services/appointment.service';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';

export interface CalendarEvent {
  id: number;
  title: string;
  type: 'video' | 'hospital' | 'home' | 'audio' | 'in-person' | 'break' | 'meeting' | 'leave';
  startHour: number;
  endHour: number;
  patientName?: string;
  date?: string;
  appointmentTime?: string;
  source?: 'backend' | 'leave';
  department?: string;
  status?: string;
  note?: string;
}

export interface DayColumn {
  name: string;
  short: string;
  date: number;
  fullDate: string;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
}

export interface MonthCell {
  date: Date;
  day: number;
  fullDate: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  eventCount: number;
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
  weekLabel = '';
  weekNumber = '';
  monthLabel = '';

  currentDate = new Date();
  selectedDate = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`;

  startHour = 8;
  endHour = 18;
  rowHeight = 64;
  hours: string[] = [];
  hourCount = 0;

  currentTimeLabel = '';
  currentTimePct = 0;
  currentTimePx = 0;
  showTimeLine = false;

  private timerId: any;
  private pollTimer: any;
  private reminderTimer: any;
  private notifiedAppointments = new Set<number>();

  days: DayColumn[] = [];
  monthDays: MonthCell[] = [];

  // Events for the selected day — used in single-day view
  selectedDayEvents: CalendarEvent[] = [];

  backendAppointments: CalendarEvent[] = [];
  leaveBlocks: CalendarEvent[] = [];
  allEvents: CalendarEvent[] = [];

  typeConfig: Record<string, { icon: string; bg: string; color: string; border: string }> = {
    video:      { icon: '📹', bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
    hospital:   { icon: '🏥', bg: '#dcfce7', color: '#166534', border: '#86efac' },
    home:       { icon: '🏠', bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
    audio:      { icon: '📞', bg: '#fce7f3', color: '#be185d', border: '#f9a8d4' },
    'in-person':{ icon: '👤', bg: '#e0f2f1', color: '#00695c', border: '#80cbc4' },
    break:      { icon: '☕', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
    meeting:    { icon: '📋', bg: '#ecfeff', color: '#0f766e', border: '#99f6e4' },
    leave:      { icon: '🚫', bg: '#fff7ed', color: '#c2410c', border: '#fdba74' }
  };

  constructor(
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.buildHours();
    this.loadAppointments();
    this.refreshView();
    this.updateCurrentTime();
    this.requestNotificationPermission();

    this.timerId = setInterval(() => this.updateCurrentTime(), 60000);
    this.pollTimer = setInterval(() => this.loadAppointments(), 30000);
    this.reminderTimer = setInterval(() => this.checkUpcomingReminders(), 60000);
  }

  ngOnDestroy() {
    if (this.timerId) clearInterval(this.timerId);
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.reminderTimer) clearInterval(this.reminderTimer);
  }

  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  checkUpcomingReminders() {
    const now = new Date();
    for (const event of this.backendAppointments) {
      if (!event.appointmentTime || !event.id) continue;
      const apptTime = new Date(event.appointmentTime);
      if (isNaN(apptTime.getTime())) continue;
      const diffMins = (apptTime.getTime() - now.getTime()) / 60000;

      if (diffMins >= 14 && diffMins <= 16 && !this.notifiedAppointments.has(event.id)) {
        this.notifiedAppointments.add(event.id);
        this.sendReminderNotification(event, 15);
      }
      if (diffMins >= 4 && diffMins <= 6 && !this.notifiedAppointments.has(event.id + 100000)) {
        this.notifiedAppointments.add(event.id + 100000);
        this.sendReminderNotification(event, 5);
      }
    }
  }

  sendReminderNotification(event: CalendarEvent, minutesBefore: number) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const time = event.appointmentTime
      ? new Date(event.appointmentTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      : '';
    new Notification(`⏰ Appointment in ${minutesBefore} minutes`, {
      body: `${event.patientName || 'Patient'} — ${time}`,
      icon: '/favicon.ico'
    });
  }

  loadAppointments() {
    const doctorId = this.authService.getDoctorId();
    if (!doctorId) {
      this.backendAppointments = [];
      this.mergeAllEvents();
      return;
    }

    this.appointmentService.getAppointmentsByDoctor(Number(doctorId)).subscribe({
      next: (appointments: Appointment[]) => {
        this.backendAppointments = (appointments || []).map((appt: Appointment, index: number) => {
          const parsed = this.parseAppointment(appt);
          return {
            id: appt.id ?? index + 1,
            title: appt.patientName || 'Patient Appointment',
            type: this.resolveAppointmentType(appt),
            startHour: parsed.hour,
            endHour: parsed.hour + 0.5,
            date: parsed.date,
            appointmentTime: parsed.isoDateTime,
            patientName: appt.patientName,
            source: 'backend' as const,
            department: appt.department,
            status: appt.status,
            note: appt.reason
          };
        });
        this.mergeAllEvents();
        this.checkUpcomingReminders();
      },
      error: (err: any) => {
        console.error('Failed to load appointments', err);
        this.backendAppointments = [];
        this.mergeAllEvents();
      }
    });
  }

  private parseAppointment(appt: Appointment): { date: string; hour: number; isoDateTime: string } {
    if ((appt as any).appointmentTime) {
      const d = new Date((appt as any).appointmentTime);
      if (!isNaN(d.getTime())) {
        return { date: this.toYMD(d), hour: d.getHours() + d.getMinutes() / 60, isoDateTime: d.toISOString() };
      }
    }
    const normalizedDate = appt.date && /^\d{4}-\d{2}-\d{2}$/.test(appt.date) ? appt.date : this.toYMD(new Date());
    const hour = this.parseTimeSlotToHour(appt.timeSlot || '09:00 AM');
    const isoDateTime = new Date(`${normalizedDate}T${this.to24Hour(appt.timeSlot || '09:00 AM')}`).toISOString();
    return { date: normalizedDate, hour, isoDateTime };
  }

  private resolveAppointmentType(appt: Appointment): CalendarEvent['type'] {
    const dept = (appt.department || '').toLowerCase();
    const consult = (appt.consultationType || '').toLowerCase();
    if (consult.includes('chat') || consult.includes('audio')) return 'audio';
    if (consult.includes('video') || dept.includes('cardio')) return 'video';
    if (dept.includes('ortho')) return 'hospital';
    if (dept.includes('neuro')) return 'in-person';
    if (dept.includes('general')) return 'meeting';
    return 'in-person';
  }

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
    if (target.source === 'backend') { alert('Patient appointments come from backend. Cancel them from the backend flow.'); return; }
    if (confirm('Remove this leave block?')) {
      this.leaveBlocks = this.leaveBlocks.filter(e => e.id !== id);
      this.mergeAllEvents();
    }
  }

  canDeleteEvent(event: CalendarEvent): boolean {
    return event.source === 'leave';
  }

  parseTimeToDecimal(time: string): number {
    const [h, m] = time.split(':').map(Number);
    if ([h, m].some(v => isNaN(v))) return NaN;
    if (h < 0 || h > 23 || m < 0 || m > 59) return NaN;
    return h + m / 60;
  }

  private parseTimeSlotToHour(value: string): number {
    const t = (value || '').trim().toUpperCase();
    const ampm = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
    if (ampm) {
      let h = Number(ampm[1]);
      const m = Number(ampm[2]);
      if (ampm[3] === 'PM' && h !== 12) h += 12;
      if (ampm[3] === 'AM' && h === 12) h = 0;
      return h + m / 60;
    }
    const plain = t.match(/(\d{1,2}):(\d{2})/);
    if (plain) return Number(plain[1]) + Number(plain[2]) / 60;
    return this.startHour;
  }

  private to24Hour(value: string): string {
    const t = (value || '').trim().toUpperCase();
    const ampm = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
    if (ampm) {
      let h = Number(ampm[1]);
      if (ampm[3] === 'PM' && h !== 12) h += 12;
      if (ampm[3] === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${ampm[2]}:00`;
    }
    const plain = t.match(/(\d{1,2}):(\d{2})/);
    if (plain) return `${String(Number(plain[1])).padStart(2, '0')}:${plain[2]}:00`;
    return '09:00:00';
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
    if (this.viewMode === 'week') {
      this.buildWeek(this.currentDate);
    } else {
      this.buildMonth(this.currentDate);
    }
    this.updateSelectedDayEvents();
  }

  /** Keep selectedDayEvents in sync whenever allEvents or selectedDate changes */
  private updateSelectedDayEvents() {
    if (this.selectedDate) {
      this.selectedDayEvents = this.allEvents
        .filter(e => e.date === this.selectedDate)
        .sort((a, b) => a.startHour - b.startHour);
    } else {
      this.selectedDayEvents = [];
    }
  }

  buildWeek(baseDate: Date) {
    const today = new Date();
    const dow = baseDate.getDay();
    const monday = new Date(baseDate);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(baseDate.getDate() - (dow === 0 ? 6 : dow - 1));
    const end = new Date(monday);
    end.setDate(monday.getDate() + 6);
    this.weekLabel = `${this.fmt(monday)} – ${this.fmt(end)}`;
    this.weekNumber = `W${this.getWeekNumber(monday)}`;

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const fullNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    this.days = dayNames.map((short, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const fullDate = this.toYMD(d);
      return {
        name: fullNames[i], short, date: d.getDate(), fullDate,
        isToday: this.isSameDay(d, today),
        isSelected: this.selectedDate === fullDate,
        events: this.allEvents.filter(e => e.date === fullDate).sort((a, b) => a.startHour - b.startHour)
      };
    });
  }

  buildMonth(baseDate: Date) {
    const today = new Date();
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    this.monthLabel = baseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1);
    const firstGridDay = new Date(firstDay);
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    firstGridDay.setDate(firstDay.getDate() - startDay);

    this.monthDays = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(firstGridDay);
      d.setDate(firstGridDay.getDate() + i);
      const fullDate = this.toYMD(d);
      this.monthDays.push({
        date: d, day: d.getDate(), fullDate,
        isCurrentMonth: d.getMonth() === month,
        isToday: this.isSameDay(d, today),
        isSelected: this.selectedDate === fullDate,
        eventCount: this.allEvents.filter(e => e.date === fullDate).length
      });
    }
  }

  selectDay(fullDate: string) {
    if (this.viewMode === 'month') {
      // From month: jump to week view with this day selected & expanded
      const d = new Date(fullDate + 'T00:00:00');
      if (!isNaN(d.getTime())) this.currentDate = d;
      this.selectedDate = fullDate;
      this.viewMode = 'week';
      this.buildWeek(this.currentDate);
      this.updateSelectedDayEvents();
      this.updateCurrentTime();
      return;
    }

    // Week view: toggle off if clicking the already-selected day
    this.selectedDate = this.selectedDate === fullDate ? '' : fullDate;
    this.days = this.days.map(day => ({ ...day, isSelected: day.fullDate === this.selectedDate }));
    this.updateSelectedDayEvents();
    this.updateCurrentTime();
  }

  /** Returns true if the selected date is today */
  isSelectedToday(): boolean {
    return this.selectedDate === this.toYMD(new Date());
  }

  setView(v: 'week' | 'month') {
    this.viewMode = v;
    this.refreshView();
    this.updateCurrentTime();
  }

  prevWeek() {
    if (this.viewMode === 'week') {
      this.currentDate = new Date(this.currentDate);
      this.currentDate.setDate(this.currentDate.getDate() - 7);
      this._keepOrAutoSelectDay();
    } else {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    }
    this.refreshView();
  }

  nextWeek() {
    if (this.viewMode === 'week') {
      this.currentDate = new Date(this.currentDate);
      this.currentDate.setDate(this.currentDate.getDate() + 7);
      this._keepOrAutoSelectDay();
      // navigated
    } else {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    }
    this.refreshView();
  }

  updateCurrentTime() {
    const now = new Date();
    const h = now.getHours() + now.getMinutes() / 60;
    this.showTimeLine = h >= this.startHour && h <= this.endHour;
    this.currentTimePx = (h - this.startHour) * this.rowHeight;
    this.currentTimePct = ((h - this.startHour) / this.hourCount) * 100;
    this.currentTimeLabel = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  getEventTop(event: CalendarEvent): string {
    return `${(event.startHour - this.startHour) * this.rowHeight}px`;
  }

  getEventHeight(event: CalendarEvent): string {
    return `${Math.max((event.endHour - event.startHour) * this.rowHeight - 8, 42)}px`;
  }

  getEventBg(type: string): string { return this.typeConfig[type]?.bg || '#f3f4f6'; }
  getEventColor(type: string): string { return this.typeConfig[type]?.color || '#374151'; }
  getEventBorder(type: string): string { return this.typeConfig[type]?.border || '#e5e7eb'; }
  getEventIcon(type: string): string { return this.typeConfig[type]?.icon || '📅'; }

  formatHour(h: number): string {
    const hour = Math.floor(h);
    const mins = h % 1 === 0.5 ? '30' : '00';
    const suffix = hour < 12 ? 'AM' : 'PM';
    const display = hour <= 12 ? (hour === 0 ? 12 : hour) : hour - 12;
    return `${display}:${mins} ${suffix}`;
  }

  openPatient(patientId: string): void {
    const event = this.allEvents.find(e => e.id.toString() === patientId);
    if (!event) return;
    const activePatient = {
      id: event.id, patientId,
      name: event.patientName || event.title || 'Patient',
      patientName: event.patientName || event.title || 'Patient',
      reason: event.note || event.title || 'Consultation',
      symptoms: event.note || event.title || 'Consultation',
      department: this.authService.getDepartment() || 'GENERAL',
      dept: this.authService.getDepartment() || 'GENERAL',
      consultationType: event.type === 'audio' ? 'AUDIO' : event.type === 'hospital' ? 'IN_PERSON' : 'VIDEO',
      priority: 'MEDIUM',
      date: event.date,
      appointmentTime: event.appointmentTime
    };
    localStorage.setItem('activePatient', JSON.stringify(activePatient));
    this.router.navigate(['/call']);
  }

  /** After week navigation, keep same weekday selected or default to Monday */
  private _keepOrAutoSelectDay() {
    if (!this.selectedDate) return;
    // Find which day-of-week was selected (0=Mon..6=Sun)
    const prev = new Date(this.selectedDate + 'T00:00:00');
    const dow = prev.getDay(); // 0=Sun,1=Mon..6=Sat
    const offset = dow === 0 ? 6 : dow - 1; // convert to Mon=0 base
    const monday = new Date(this.currentDate);
    const curDow = monday.getDay();
    monday.setDate(monday.getDate() - (curDow === 0 ? 6 : curDow - 1));
    const target = new Date(monday);
    target.setDate(monday.getDate() + offset);
    this.selectedDate = this.toYMD(target);
  }

  private fmt(d: Date): string {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private toYMD(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private isSameDay(a: Date, b: Date): boolean {
    return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  }

  private getWeekNumber(date: Date): number {
    const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = temp.getUTCDay() || 7;
    temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
    return Math.ceil((((temp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}   
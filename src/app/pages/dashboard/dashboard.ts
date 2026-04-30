import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Appointment, AppointmentService } from '../../services/appointment.service';
import { AuthService } from '../../services/auth';

type PriorityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

type PatientRow = {
  id: string;
  name: string;
  initials: string;
  caseId: string;
  priority: PriorityLevel | string;
  startDate: string;
  endDate: string;
  age: number | string;
  gender: string;
  reason: string;
  consultationType?: 'VIDEO' | 'AUDIO' | 'CHAT' | 'IN_PERSON';
  appointmentId?: number;
  appointmentTime?: string;
  department?: string;
  raw?: Appointment;
};

type AppointmentItem = {
  id: number;
  patientId: string;
  patientName: string;
  time: string;
  note: string;
  color: string;
  status: 'scheduled' | 'pending' | 'completed' | 'cancelled';
  date: string;
  department?: string;
  consultationType?: 'VIDEO' | 'AUDIO' | 'CHAT' | 'IN_PERSON';
  raw?: Appointment;
};

type ScheduleBlock = {
  id: number;
  patientId: string;
  patientName: string;
  time: string;
  note: string;
  left: string;
  width: string;
  bg: string;
  color: string;
  date: string;
  raw?: Appointment;
};

type CalendarDay = {
  date: number | null;
  isToday: boolean;
  isSelected: boolean;
  hasAppointment: boolean;
  isPending: boolean;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit, OnDestroy {
  doctorName = '';
  doctorDepartment = '';

  greeting = 'Good Morning';
  isLoading = false;

  patientRows: PatientRow[] = [];
  allAppointments: AppointmentItem[] = [];
  allScheduleBlocks: ScheduleBlock[] = [];
  sourceAppointments: Appointment[] = [];

  todayAppointments: AppointmentItem[] = [];
  todaySchedule: ScheduleBlock[] = [];

  calendarViewYear = new Date().getFullYear();
  calendarViewMonth = new Date().getMonth();
  calendarDays: CalendarDay[] = [];
  selectedDate = this.toYMD(new Date());

  sortAsc = true;
  private refreshTimer: any;

  constructor(
    private router: Router,
    private appointmentService: AppointmentService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.setGreeting();
    this.doctorName = this.authService.getDoctorName() || 'Doctor';
    this.doctorDepartment = this.authService.getDepartment() || 'GENERAL';

    const now = new Date();
    this.calendarViewYear = now.getFullYear();
    this.calendarViewMonth = now.getMonth();
    this.selectedDate = this.toYMD(now);

    this.loadDoctorDashboardData(true);
    this.refreshTimer = setInterval(() => this.loadDoctorDashboardData(false), 30000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  get calendarMonth(): string {
    const names = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${names[this.calendarViewMonth]} ${this.calendarViewYear}`;
  }

  get totalCases(): number {
    return this.todayAppointments.length;
  }

  get resolvedCases(): number {
    return this.sourceAppointments.filter(a => {
      const dateKey = this.extractDate(a);
      return dateKey === this.selectedDate && (a.status || '').toLowerCase() === 'completed';
    }).length;
  }

  get urgentCount(): number {
    return this.patientRows.filter(p => this.priorityClass(String(p.priority)) === 'high').length;
  }

  get avgResponse(): string {
    return 'Live';
  }

  get inQueue(): number {
    return this.sourceAppointments.filter(a => this.isQueueVisible(a)).length;
  }

  get sortLabel(): string {
    return this.sortAsc ? 'A–Z' : 'Z–A';
  }

  get formattedSelectedDate(): string {
    const [y, m, d] = this.selectedDate.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
  }

  setGreeting(): void {
    const hour = new Date().getHours();
    if (hour < 12) this.greeting = 'Good Morning';
    else if (hour < 17) this.greeting = 'Good Afternoon';
    else this.greeting = 'Good Evening';
  }

  loadDoctorDashboardData(showLoader: boolean = true): void {
    const doctorId = this.authService.getDoctorId();

    if (!doctorId) {
      this.patientRows = [];
      this.allAppointments = [];
      this.allScheduleBlocks = [];
      this.todayAppointments = [];
      this.todaySchedule = [];
      this.calendarDays = [];
      return;
    }

    if (showLoader) this.isLoading = true;

    this.appointmentService.getAppointmentsByDoctor(doctorId).subscribe({
      next: (appointments: Appointment[]) => {
        const cleaned = (appointments || []).filter(appt => this.belongsToLoggedInDoctor(appt));
        const visible = cleaned.filter(appt => this.isVisibleAppointment(appt));

        this.sourceAppointments = visible;
        this.allAppointments = visible.map((appt, index) => this.mapAppointmentItem(appt, index));
        this.allScheduleBlocks = visible.map((appt, index) => this.mapScheduleBlock(appt, index));
        this.patientRows = this.buildPatientRows(visible);

        this.buildCalendarDays();
        this.filterByDate(this.selectedDate);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load dashboard appointments', error);
        this.sourceAppointments = [];
        this.patientRows = [];
        this.allAppointments = [];
        this.allScheduleBlocks = [];
        this.todayAppointments = [];
        this.todaySchedule = [];
        this.buildCalendarDays();
        this.isLoading = false;
      }
    });
  }

  buildPatientRows(appointments: Appointment[]): PatientRow[] {
    const map = new Map<string, PatientRow>();

    appointments
      .filter(appt => this.isUpcomingOrLive(appt))
      .forEach((appt, index) => {
        const patientKey = String(appt.patientId || appt.id || `${appt.patientName}-${index}`);

        if (!map.has(patientKey)) {
          map.set(patientKey, {
            id: patientKey,
            name: appt.patientName || 'Patient',
            initials: this.getInitials(appt.patientName || 'Patient'),
            caseId: `CASE-${appt.id ?? index + 1}`,
            priority: this.mapPriority(appt.status),
            startDate: this.extractDate(appt) === this.toYMD(new Date())
              ? 'Today'
              : this.formatShortDate(this.extractDate(appt)),
            endDate: '—',
            age: '--',
            gender: '--',
            reason: appt.reason || 'Consultation',
            consultationType: this.resolveConsultationType(appt),
            appointmentId: appt.id ?? index + 1,
            appointmentTime: this.extractAppointmentDateTimeISO(appt),
            department: appt.department,
            raw: appt
          });
        }
      });

    const rows = Array.from(map.values());
    return rows.sort((a, b) => this.sortAsc
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name)
    );
  }

  mapAppointmentItem(appt: Appointment, index: number): AppointmentItem {
    return {
      id: appt.id ?? index + 1,
      patientId: String(appt.patientId || appt.id || index + 1),
      patientName: appt.patientName || 'Patient',
      time: this.normalizeDisplayTime(appt),
      note: appt.reason || 'Consultation',
      color: this.getStatusColor(appt.status),
      status: this.normalizeStatus(appt.status),
      date: this.extractDate(appt),
      department: appt.department,
      consultationType: this.resolveConsultationType(appt),
      raw: appt
    };
  }

  mapScheduleBlock(appt: Appointment, index: number): ScheduleBlock {
    const hour = this.extractHour(appt);

    return {
      id: appt.id ?? index + 1,
      patientId: String(appt.patientId || appt.id || index + 1),
      patientName: appt.patientName || 'Patient',
      time: this.normalizeDisplayTime(appt),
      note: appt.reason || 'Consultation',
      left: this.getTimelineLeft(hour),
      width: '13%',
      bg: this.getStatusBg(appt.status),
      color: this.getStatusColor(appt.status),
      date: this.extractDate(appt),
      raw: appt
    };
  }

  prevMonth(): void {
    if (this.calendarViewMonth === 0) {
      this.calendarViewMonth = 11;
      this.calendarViewYear--;
    } else {
      this.calendarViewMonth--;
    }
    this.buildCalendarDays();
  }

  nextMonth(): void {
    if (this.calendarViewMonth === 11) {
      this.calendarViewMonth = 0;
      this.calendarViewYear++;
    } else {
      this.calendarViewMonth++;
    }
    this.buildCalendarDays();
  }

  buildCalendarDays(): void {
    const year = this.calendarViewYear;
    const month = this.calendarViewMonth;
    const now = new Date();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay();
    const offset = firstDow === 0 ? 6 : firstDow - 1;

    const [selYear, selMonth, selDate] = this.selectedDate.split('-').map(Number);

    const apptDates = new Set<number>();
    const pendingDates = new Set<number>();

    for (const appt of this.allAppointments) {
      const [ay, am, ad] = appt.date.split('-').map(Number);
      if (ay === year && am - 1 === month) {
        if (appt.status === 'pending') pendingDates.add(ad);
        else apptDates.add(ad);
      }
    }

    const days: CalendarDay[] = [];

    for (let i = 0; i < offset; i++) {
      days.push({
        date: null,
        isToday: false,
        isSelected: false,
        hasAppointment: false,
        isPending: false
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        date: d,
        isToday: d === now.getDate() && month === now.getMonth() && year === now.getFullYear(),
        isSelected: d === selDate && month === (selMonth - 1) && year === selYear,
        hasAppointment: apptDates.has(d),
        isPending: pendingDates.has(d)
      });
    }

    this.calendarDays = days;
  }

  selectDate(day: CalendarDay): void {
    if (!day.date) return;

    const m = String(this.calendarViewMonth + 1).padStart(2, '0');
    const d = String(day.date).padStart(2, '0');
    this.selectedDate = `${this.calendarViewYear}-${m}-${d}`;

    this.buildCalendarDays();
    this.filterByDate(this.selectedDate);
  }

  filterByDate(dateStr: string): void {
    this.todayAppointments = this.allAppointments.filter(a => a.date === dateStr);
    this.todaySchedule = this.allScheduleBlocks.filter(b => b.date === dateStr);
  }

  priorityClass(priority: string): 'high' | 'medium' | 'low' {
    const p = (priority || '').toLowerCase();
    if (p.includes('high')) return 'high';
    if (p.includes('low')) return 'low';
    return 'medium';
  }

  sortPatients(): void {
    this.sortAsc = !this.sortAsc;
    this.patientRows = [...this.patientRows].sort((a, b) =>
      this.sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );
  }

  goToQueue(): void {
    this.router.navigate(['/queue']);
  }

  goToSchedule(): void {
    this.router.navigate(['/schedule']);
  }

  openPatient(patientId: string): void {
    if (!patientId) return;
    this.router.navigate(['/monitor', patientId]);
  }

  acceptFromDashboard(patient: PatientRow): void {
    const activePatient = {
      id: patient.appointmentId ?? patient.id,
      patientId: patient.id,
      name: patient.name,
      patientName: patient.name,
      reason: patient.reason || 'Consultation',
      symptoms: patient.reason || 'Consultation',
      department: patient.department || this.doctorDepartment,
      dept: patient.department || this.doctorDepartment,
      consultationType: patient.consultationType || 'VIDEO',
      priority: patient.priority || 'MEDIUM',
      appointmentTime: patient.appointmentTime || null
    };

    localStorage.setItem('activePatient', JSON.stringify(activePatient));
    this.router.navigate(['/call']);
  }

  private belongsToLoggedInDoctor(appt: Appointment): boolean {
    const doctorId = this.authService.getDoctorId();
    return Number(appt.doctorId) === Number(doctorId);
  }

  private isVisibleAppointment(appt: Appointment): boolean {
    const status = (appt.status || 'scheduled').toLowerCase();

    if (status === 'cancelled') return false;
    if (status === 'completed') return false;

    const appointmentDateTime = this.getAppointmentDateTime(appt);
    if (!appointmentDateTime) return true;

    const now = new Date();
    if (appointmentDateTime.getTime() < now.getTime()) return false;

    return true;
  }

  private isUpcomingOrLive(appt: Appointment): boolean {
    const dt = this.getAppointmentDateTime(appt);
    if (!dt) return false;
    return dt.getTime() >= Date.now();
  }

  private isQueueVisible(appt: Appointment): boolean {
    const status = (appt.status || '').toLowerCase();
    if (status === 'completed' || status === 'cancelled') return false;

    const dt = this.getAppointmentDateTime(appt);
    if (!dt) return true;

    return Date.now() - dt.getTime() <= 2 * 60 * 60 * 1000;
  }

  private normalizeStatus(status?: string): 'scheduled' | 'pending' | 'completed' | 'cancelled' {
    const s = (status || 'scheduled').toLowerCase();
    if (s === 'pending' || s === 'completed' || s === 'cancelled') return s;
    return 'scheduled';
  }

  private resolveConsultationType(appt: Appointment): 'VIDEO' | 'AUDIO' | 'CHAT' | 'IN_PERSON' {
    const type = (appt.consultationType || '').toLowerCase();
    if (type.includes('chat')) return 'CHAT';
    if (type.includes('audio') || type.includes('call')) return 'AUDIO';
    if (type.includes('person') || type.includes('hospital')) return 'IN_PERSON';
    return 'VIDEO';
  }

  private mapPriority(status?: string): PriorityLevel | string {
    const s = (status || '').toLowerCase();
    if (s === 'pending') return 'HIGH';
    if (s === 'scheduled') return 'MEDIUM';
    return 'LOW';
  }

  private extractDate(appt: Appointment): string {
    if (appt.appointmentTime) {
      const d = new Date(appt.appointmentTime);
      if (!isNaN(d.getTime())) return this.toYMD(d);
    }

    if (appt.date && /^\d{4}-\d{2}-\d{2}$/.test(appt.date)) {
      return appt.date;
    }

    return this.toYMD(new Date());
  }

  private extractHour(appt: Appointment): number {
    if (appt.appointmentTime) {
      const d = new Date(appt.appointmentTime);
      if (!isNaN(d.getTime())) return d.getHours() + d.getMinutes() / 60;
    }

    return this.parseTimeSlotToHour(appt.timeSlot || '09:00 AM');
  }

  private extractAppointmentDateTimeISO(appt: Appointment): string {
    const dt = this.getAppointmentDateTime(appt);
    return dt ? dt.toISOString() : new Date().toISOString();
  }

  private normalizeDisplayTime(appt: Appointment): string {
    const dt = this.getAppointmentDateTime(appt);
    if (dt) {
      return dt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    return appt.timeSlot || '09:00 AM';
  }

  private getAppointmentDateTime(appt: Appointment): Date | null {
    if (appt.appointmentTime) {
      const d = new Date(appt.appointmentTime);
      if (!isNaN(d.getTime())) return d;
    }

    if (appt.date && appt.timeSlot) {
      const iso = this.to24Hour(appt.timeSlot);
      const d = new Date(`${appt.date}T${iso}`);
      if (!isNaN(d.getTime())) return d;
    }

    return null;
  }

  private parseTimeSlotToHour(value: string): number {
    const t = (value || '').trim().toUpperCase();
    const ampm = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);

    if (ampm) {
      let h = Number(ampm[1]);
      const m = Number(ampm[2]);
      const suffix = ampm[3];

      if (suffix === 'PM' && h !== 12) h += 12;
      if (suffix === 'AM' && h === 12) h = 0;

      return h + m / 60;
    }

    const plain = t.match(/(\d{1,2}):(\d{2})/);
    if (plain) {
      return Number(plain[1]) + Number(plain[2]) / 60;
    }

    return 9;
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

  private getTimelineLeft(hour: number): string {
    const start = 8;
    const end = 18;
    const usable = end - start;
    const safeHour = Math.max(start, Math.min(hour, end));
    const pct = ((safeHour - start) / usable) * 84;
    return `${11 + pct}%`;
  }

  private getStatusColor(status?: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'pending') return '#d97706';
    if (s === 'completed') return '#64748b';
    if (s === 'cancelled') return '#dc2626';
    return '#16a34a';
  }

  private getStatusBg(status?: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'pending') return '#fef3c7';
    if (s === 'completed') return '#f1f5f9';
    if (s === 'cancelled') return '#fee2e2';
    return '#dcfce7';
  }

  private getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  private formatShortDate(dateStr: string): string {
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private toYMD(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

type DoctorKey = 'cardio' | 'neuro' | 'ortho';
type PriorityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

type PatientRow = {
  id: string;
  name: string;
  initials: string;
  caseId: string;
  priority: PriorityLevel | string;
  startDate: string;
  endDate: string;
  age: number;
  gender: string;
  reason: string;
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
export class Dashboard implements OnInit {
  doctorKey: DoctorKey = 'cardio';
  doctorName = 'Dr. Smith';
  doctorDepartment = 'CARDIO';

  greeting = 'Good Morning';
  isLoading = false;

  patientRows: PatientRow[] = [];
  allAppointments: AppointmentItem[] = [];
  allScheduleBlocks: ScheduleBlock[] = [];

  todayAppointments: AppointmentItem[] = [];
  todaySchedule: ScheduleBlock[] = [];

  calendarViewYear = 2026;
  calendarViewMonth = 3;

  calendarDays: CalendarDay[] = [];

  private readonly TODAY_YEAR = 2026;
  private readonly TODAY_MONTH = 3;
  private readonly TODAY_DATE = 16;

  selectedDate = `${this.TODAY_YEAR}-${String(this.TODAY_MONTH + 1).padStart(2, '0')}-${String(this.TODAY_DATE).padStart(2, '0')}`;

  get calendarMonth(): string {
    const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${names[this.calendarViewMonth]} ${this.calendarViewYear}`;
  }

  doctorSeedData: Record<DoctorKey, {
    doctorName: string;
    department: string;
    patients: PatientRow[];
    appointments: AppointmentItem[];
    scheduleBlocks: ScheduleBlock[];
  }> = {
    cardio: {
      doctorName: 'Dr. Smith',
      department: 'CARDIO',
      patients: [
        { id: 'C-1042', name: 'Priya Mehta', initials: 'PM', caseId: 'CASE-1001', priority: 'MEDIUM', startDate: 'Today', endDate: '—', age: 52, gender: 'Female', reason: 'Cardiac follow-up' },
        { id: 'C-1043', name: 'Rohan Verma', initials: 'RV', caseId: 'CASE-1002', priority: 'MEDIUM', startDate: 'Today', endDate: '—', age: 48, gender: 'Male', reason: 'Post-op check' }
      ],
      appointments: [
        { id: 1, patientId: 'C-1042', patientName: 'Priya Mehta', time: '09:00 AM', note: 'Follow-up consultation', color: '#3b82f6', status: 'scheduled', date: '2026-04-16' },
        { id: 2, patientId: 'C-1043', patientName: 'Rohan Verma', time: '02:30 PM', note: 'Post-op check', color: '#2563eb', status: 'pending', date: '2026-04-16' },
        { id: 3, patientId: 'C-1042', patientName: 'Priya Mehta', time: '11:00 AM', note: 'ECG review', color: '#3b82f6', status: 'scheduled', date: '2026-04-19' },
        { id: 4, patientId: 'C-1043', patientName: 'Rohan Verma', time: '03:00 PM', note: 'Medication review', color: '#2563eb', status: 'pending', date: '2026-04-23' },
        { id: 5, patientId: 'C-1042', patientName: 'Priya Mehta', time: '10:00 AM', note: 'Final discharge check', color: '#3b82f6', status: 'scheduled', date: '2026-05-05' }
      ],
      scheduleBlocks: [
        { id: 1, patientId: 'C-1042', patientName: 'Priya Mehta', time: '09:00 AM', note: 'Follow-up consultation', left: '11%', width: '14%', bg: '#dbeafe', color: '#1d4ed8', date: '2026-04-16' },
        { id: 2, patientId: 'C-1043', patientName: 'Rohan Verma', time: '02:30 PM', note: 'Post-op check', left: '66%', width: '13%', bg: '#dbeafe', color: '#1d4ed8', date: '2026-04-16' },
        { id: 3, patientId: 'C-1042', patientName: 'Priya Mehta', time: '11:00 AM', note: 'ECG review', left: '30%', width: '14%', bg: '#dbeafe', color: '#1d4ed8', date: '2026-04-19' },
        { id: 4, patientId: 'C-1043', patientName: 'Rohan Verma', time: '03:00 PM', note: 'Medication review', left: '70%', width: '13%', bg: '#dbeafe', color: '#1d4ed8', date: '2026-04-23' },
        { id: 5, patientId: 'C-1042', patientName: 'Priya Mehta', time: '10:00 AM', note: 'Final discharge check', left: '20%', width: '14%', bg: '#dbeafe', color: '#1d4ed8', date: '2026-05-05' }
      ]
    },
    neuro: {
      doctorName: 'Dr. Adams',
      department: 'NEURO',
      patients: [
        { id: 'N-2011', name: 'Amit Sharma', initials: 'AS', caseId: 'CASE-2001', priority: 'HIGH', startDate: 'Today', endDate: '—', age: 45, gender: 'Male', reason: 'Migraine review' },
        { id: 'N-2012', name: 'Neha Sharma', initials: 'NS', caseId: 'CASE-2002', priority: 'MEDIUM', startDate: 'Today', endDate: '—', age: 39, gender: 'Female', reason: 'MRI review' }
      ],
      appointments: [
        { id: 10, patientId: 'N-2011', patientName: 'Amit Sharma', time: '10:00 AM', note: 'Migraine consultation', color: '#8b5cf6', status: 'scheduled', date: '2026-04-17' },
        { id: 11, patientId: 'N-2012', patientName: 'Neha Sharma', time: '11:30 AM', note: 'MRI review', color: '#f59e0b', status: 'pending', date: '2026-04-17' },
        { id: 12, patientId: 'N-2011', patientName: 'Amit Sharma', time: '09:00 AM', note: 'EEG scan follow-up', color: '#8b5cf6', status: 'scheduled', date: '2026-04-22' },
        { id: 13, patientId: 'N-2012', patientName: 'Neha Sharma', time: '02:00 PM', note: 'Neuro assessment', color: '#f59e0b', status: 'completed', date: '2026-04-14' }
      ],
      scheduleBlocks: [
        { id: 10, patientId: 'N-2011', patientName: 'Amit Sharma', time: '10:00 AM', note: 'Migraine consultation', left: '20%', width: '13%', bg: '#ede9fe', color: '#6d28d9', date: '2026-04-17' },
        { id: 11, patientId: 'N-2012', patientName: 'Neha Sharma', time: '11:30 AM', note: 'MRI review', left: '35%', width: '14%', bg: '#fef3c7', color: '#b45309', date: '2026-04-17' },
        { id: 12, patientId: 'N-2011', patientName: 'Amit Sharma', time: '09:00 AM', note: 'EEG scan follow-up', left: '11%', width: '13%', bg: '#ede9fe', color: '#6d28d9', date: '2026-04-22' },
        { id: 13, patientId: 'N-2012', patientName: 'Neha Sharma', time: '02:00 PM', note: 'Neuro assessment', left: '55%', width: '14%', bg: '#fef3c7', color: '#b45309', date: '2026-04-14' }
      ]
    },
    ortho: {
      doctorName: 'Dr. Patel',
      department: 'ORTHO',
      patients: [
        { id: 'O-3001', name: 'Vikram Singh', initials: 'VS', caseId: 'CASE-3001', priority: 'MEDIUM', startDate: 'Today', endDate: '—', age: 56, gender: 'Male', reason: 'Knee pain review' },
        { id: 'O-3002', name: 'Pooja Nair', initials: 'PN', caseId: 'CASE-3002', priority: 'HIGH', startDate: 'Today', endDate: '—', age: 34, gender: 'Female', reason: 'Fracture follow-up' }
      ],
      appointments: [
        { id: 20, patientId: 'O-3001', patientName: 'Vikram Singh', time: '09:30 AM', note: 'Knee pain review', color: '#10b981', status: 'scheduled', date: '2026-04-18' },
        { id: 21, patientId: 'O-3002', patientName: 'Pooja Nair', time: '03:00 PM', note: 'Fracture follow-up', color: '#ef4444', status: 'pending', date: '2026-04-18' },
        { id: 22, patientId: 'O-3001', patientName: 'Vikram Singh', time: '11:00 AM', note: 'Physio assessment', color: '#10b981', status: 'scheduled', date: '2026-04-25' },
        { id: 23, patientId: 'O-3002', patientName: 'Pooja Nair', time: '10:30 AM', note: 'X-ray review', color: '#ef4444', status: 'completed', date: '2026-04-15' }
      ],
      scheduleBlocks: [
        { id: 20, patientId: 'O-3001', patientName: 'Vikram Singh', time: '09:30 AM', note: 'Knee pain review', left: '15%', width: '14%', bg: '#d1fae5', color: '#047857', date: '2026-04-18' },
        { id: 21, patientId: 'O-3002', patientName: 'Pooja Nair', time: '03:00 PM', note: 'Fracture follow-up', left: '70%', width: '13%', bg: '#fee2e2', color: '#b91c1c', date: '2026-04-18' },
        { id: 22, patientId: 'O-3001', patientName: 'Vikram Singh', time: '11:00 AM', note: 'Physio assessment', left: '30%', width: '14%', bg: '#d1fae5', color: '#047857', date: '2026-04-25' },
        { id: 23, patientId: 'O-3002', patientName: 'Pooja Nair', time: '10:30 AM', note: 'X-ray review', left: '22%', width: '13%', bg: '#fee2e2', color: '#b91c1c', date: '2026-04-15' }
      ]
    }
  };

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.setGreeting();
    this.detectLoggedInDoctor();
    this.loadDoctorDashboardData();
    this.buildCalendarDays();
    this.filterByDate(this.selectedDate);
  }

  setGreeting(): void {
    const hour = new Date().getHours();
    if (hour < 12) this.greeting = 'Good Morning';
    else if (hour < 17) this.greeting = 'Good Afternoon';
    else this.greeting = 'Good Evening';
  }

  detectLoggedInDoctor(): void {
    const dept = (this.authService.getDepartment() || '').toLowerCase();
    const loggedName = this.authService.getDoctorName();

    if (dept.includes('neuro')) {
      this.doctorKey = 'neuro';
    } else if (dept.includes('ortho')) {
      this.doctorKey = 'ortho';
    } else {
      this.doctorKey = 'cardio';
    }

    if (loggedName) {
      this.doctorName = loggedName;
    }
  }

  loadDoctorDashboardData(): void {
    const data = this.doctorSeedData[this.doctorKey];
    this.doctorName = this.authService.getDoctorName() || data.doctorName;
    this.doctorDepartment = this.authService.getDepartment() || data.department;
    this.patientRows = [...data.patients];
    this.allAppointments = [...data.appointments];
    this.allScheduleBlocks = [...data.scheduleBlocks];
    this.isLoading = false;
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
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const firstDow = new Date(year, month, 1).getDay();
    const offset = firstDow === 0 ? 6 : firstDow - 1;

    const selectedParts = this.selectedDate.split('-');
    const selYear = parseInt(selectedParts[0], 10);
    const selMonth = parseInt(selectedParts[1], 10) - 1;
    const selDate = parseInt(selectedParts[2], 10);

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
        isToday: d === this.TODAY_DATE && month === this.TODAY_MONTH && year === this.TODAY_YEAR,
        isSelected: d === selDate && month === selMonth && year === selYear,
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

  openPatient(patientId: string): void {
    if (!patientId) return;
    this.router.navigate(['/monitor', patientId]);
  }

  goToSchedule(): void {
    this.router.navigate(['/schedule']);
  }

  get totalCases(): number {
    return this.patientRows.length;
  }

  get resolvedCases(): number {
    return Math.max(this.patientRows.length - 1, 0);
  }

  get urgentCount(): number {
    return this.patientRows.filter(p => this.priorityClass(p.priority) === 'high').length;
  }

  get avgResponse(): string {
    return 'Live';
  }

  get inQueue(): number {
    return Math.max(this.patientRows.length - 1, 0);
  }

  sortAsc = true;

  get sortLabel(): string {
    return this.sortAsc ? 'A–Z' : 'Z–A';
  }

  sortPatients(): void {
    this.sortAsc = !this.sortAsc;
    this.patientRows = [...this.patientRows].sort((a, b) =>
      this.sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );
  }

  get formattedSelectedDate(): string {
    const [y, m, d] = this.selectedDate.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
  }
}
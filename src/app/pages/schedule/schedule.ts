import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

type DoctorKey = 'cardio' | 'neuro' | 'ortho';

type ScheduleEvent = {
  id: number;
  patientId: string;
  patientName: string;
  title: string;
  type: 'video' | 'hospital' | 'home' | 'in-person';
  startHour: number;
  endHour: number;
  note: string;
};

type SidePatient = {
  id: string;
  name: string;
  age: number;
  gender: string;
  caseId: string;
  reason: string;
};

type DayColumn = {
  short: string;
  date: number;
  fullDate: string;
  isToday: boolean;
  events: ScheduleEvent[];
};

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './schedule.html',
  styleUrls: ['./schedule.css']
})
export class Schedule implements OnInit {
  doctorKey: DoctorKey = 'cardio';
  currentDate = new Date();
  weekLabel = '';
  days: DayColumn[] = [];
  hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  sidePatients: SidePatient[] = [];
  todayAppointments: ScheduleEvent[] = [];

  doctorSeedData: Record<DoctorKey, { patients: SidePatient[]; appointments: ScheduleEvent[] }> = {
    cardio: {
      patients: [
        { id: 'C-1042', name: 'Priya Mehta', age: 52, gender: 'Female', caseId: 'CASE-1001', reason: 'Cardiac follow-up' },
        { id: 'C-1043', name: 'Rohan Verma', age: 48, gender: 'Male', caseId: 'CASE-1002', reason: 'Post-op check' }
      ],
      appointments: [
        { id: 1, patientId: 'C-1042', patientName: 'Priya Mehta', title: 'Priya Mehta', type: 'video', startHour: 9, endHour: 10, note: 'Follow-up consultation' },
        { id: 2, patientId: 'C-1043', patientName: 'Rohan Verma', title: 'Rohan Verma', type: 'home', startHour: 14.5, endHour: 16, note: 'Post-op check' }
      ]
    },
    neuro: {
      patients: [
        { id: 'N-2011', name: 'Amit Sharma', age: 45, gender: 'Male', caseId: 'CASE-2001', reason: 'Migraine review' },
        { id: 'N-2012', name: 'Neha Sharma', age: 39, gender: 'Female', caseId: 'CASE-2002', reason: 'MRI review' }
      ],
      appointments: [
        { id: 3, patientId: 'N-2011', patientName: 'Amit Sharma', title: 'Amit Sharma', type: 'video', startHour: 10, endHour: 11, note: 'Migraine consultation' },
        { id: 4, patientId: 'N-2012', patientName: 'Neha Sharma', title: 'Neha Sharma', type: 'hospital', startHour: 11.5, endHour: 12.5, note: 'MRI review' }
      ]
    },
    ortho: {
      patients: [
        { id: 'O-3001', name: 'Vikram Singh', age: 56, gender: 'Male', caseId: 'CASE-3001', reason: 'Knee pain review' },
        { id: 'O-3002', name: 'Pooja Nair', age: 34, gender: 'Female', caseId: 'CASE-3002', reason: 'Fracture follow-up' }
      ],
      appointments: [
        { id: 5, patientId: 'O-3001', patientName: 'Vikram Singh', title: 'Vikram Singh', type: 'in-person', startHour: 9.5, endHour: 10.5, note: 'Knee pain review' },
        { id: 6, patientId: 'O-3002', patientName: 'Pooja Nair', title: 'Pooja Nair', type: 'hospital', startHour: 15, endHour: 16, note: 'Fracture follow-up' }
      ]
    }
  };

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.detectLoggedInDoctor();
    this.loadDoctorData();
    this.buildWeek();
    this.attachTodayAppointments();
  }

  detectLoggedInDoctor(): void {
    const storedDept = (localStorage.getItem('doctorDepartment') || '').toLowerCase();

    if (storedDept.includes('neuro')) {
      this.doctorKey = 'neuro';
    } else if (storedDept.includes('ortho')) {
      this.doctorKey = 'ortho';
    } else {
      this.doctorKey = 'cardio';
    }
  }

  loadDoctorData(): void {
    const data = this.doctorSeedData[this.doctorKey];
    this.sidePatients = [...data.patients];
    this.todayAppointments = [...data.appointments];
  }

  buildWeek(): void {
    const today = new Date();
    const current = new Date(this.currentDate);
    const day = current.getDay();
    const monday = new Date(current);
    monday.setDate(current.getDate() - (day === 0 ? 6 : day - 1));

    const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    this.days = names.map((short, index) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index);

      return {
        short,
        date: d.getDate(),
        fullDate: this.toYMD(d),
        isToday: this.toYMD(d) === this.toYMD(today),
        events: []
      };
    });

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    this.weekLabel = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  attachTodayAppointments(): void {
    const todayKey = this.toYMD(new Date());
    const todayCol = this.days.find(d => d.fullDate === todayKey);

    if (todayCol) {
      todayCol.events = [...this.todayAppointments];
    }
  }

  prevWeek(): void {
    this.currentDate = new Date(this.currentDate);
    this.currentDate.setDate(this.currentDate.getDate() - 7);
    this.buildWeek();
    this.attachTodayAppointments();
  }

  nextWeek(): void {
    this.currentDate = new Date(this.currentDate);
    this.currentDate.setDate(this.currentDate.getDate() + 7);
    this.buildWeek();
    this.attachTodayAppointments();
  }

  openPatient(patientId: string): void {
    if (!patientId) return;
    this.router.navigate(['/monitor', patientId]);
  }

  toYMD(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  getEventTop(startHour: number): string {
    return `${(startHour - 8) * 64}px`;
  }

  getEventHeight(startHour: number, endHour: number): string {
    return `${(endHour - startHour) * 64 - 6}px`;
  }

  getEventBg(type: string): string {
    if (type === 'video') return '#dbeafe';
    if (type === 'hospital') return '#fef3c7';
    if (type === 'home') return '#d1fae5';
    return '#ede9fe';
  }

  getEventColor(type: string): string {
    if (type === 'video') return '#1d4ed8';
    if (type === 'hospital') return '#b45309';
    if (type === 'home') return '#047857';
    return '#6d28d9';
  }

  formatHour(hour: number): string {
    const whole = Math.floor(hour);
    const mins = hour % 1 === 0.5 ? '30' : '00';
    const suffix = whole >= 12 ? 'PM' : 'AM';
    const rawDisplay = whole > 12 ? whole - 12 : whole;
    const display = rawDisplay === 0 ? 12 : rawDisplay;
    return `${display}:${mins} ${suffix}`;
  }
}
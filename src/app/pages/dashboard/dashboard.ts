import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

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

  greeting = 'Good Afternoon';
  isLoading = false;

  patientRows: PatientRow[] = [];
  todayAppointments: AppointmentItem[] = [];
  todaySchedule: ScheduleBlock[] = [];

  calendarMonth = 'April 2026';
  selectedDate = '2026-04-16';
  calendarDays: CalendarDay[] = [];

  doctorSeedData: Record<DoctorKey, {
    doctorName: string;
    department: string;
    patients: PatientRow[];
    appointments: AppointmentItem[];
    schedule: ScheduleBlock[];
  }> = {
    cardio: {
      doctorName: 'Dr. Smith',
      department: 'CARDIO',
      patients: [
        {
          id: 'C-1042',
          name: 'Priya Mehta',
          initials: 'PM',
          caseId: 'CASE-1001',
          priority: 'MEDIUM',
          startDate: 'Today',
          endDate: '—',
          age: 52,
          gender: 'Female',
          reason: 'Cardiac follow-up'
        },
        {
          id: 'C-1043',
          name: 'Rohan Verma',
          initials: 'RV',
          caseId: 'CASE-1002',
          priority: 'MEDIUM',
          startDate: 'Today',
          endDate: '—',
          age: 48,
          gender: 'Male',
          reason: 'Post-op check'
        }
      ],
      appointments: [
        {
          id: 1,
          patientId: 'C-1042',
          patientName: 'Priya Mehta',
          time: '09:00 AM',
          note: 'Follow-up consultation',
          color: '#3b82f6',
          status: 'scheduled'
        },
        {
          id: 2,
          patientId: 'C-1043',
          patientName: 'Rohan Verma',
          time: '02:30 PM',
          note: 'Post-op check',
          color: '#2563eb',
          status: 'pending'
        }
      ],
      schedule: [
        {
          id: 1,
          patientId: 'C-1042',
          patientName: 'Priya Mehta',
          time: '09:00 AM',
          note: 'Follow-up consultation',
          left: '11%',
          width: '14%',
          bg: '#dbeafe',
          color: '#1d4ed8'
        },
        {
          id: 2,
          patientId: 'C-1043',
          patientName: 'Rohan Verma',
          time: '02:30 PM',
          note: 'Post-op check',
          left: '66%',
          width: '13%',
          bg: '#dbeafe',
          color: '#1d4ed8'
        }
      ]
    },
    neuro: {
      doctorName: 'Dr. Adams',
      department: 'NEURO',
      patients: [
        {
          id: 'N-2011',
          name: 'Amit Sharma',
          initials: 'AS',
          caseId: 'CASE-2001',
          priority: 'HIGH',
          startDate: 'Today',
          endDate: '—',
          age: 45,
          gender: 'Male',
          reason: 'Migraine review'
        },
        {
          id: 'N-2012',
          name: 'Neha Sharma',
          initials: 'NS',
          caseId: 'CASE-2002',
          priority: 'MEDIUM',
          startDate: 'Today',
          endDate: '—',
          age: 39,
          gender: 'Female',
          reason: 'MRI review'
        }
      ],
      appointments: [
        {
          id: 3,
          patientId: 'N-2011',
          patientName: 'Amit Sharma',
          time: '10:00 AM',
          note: 'Migraine consultation',
          color: '#8b5cf6',
          status: 'scheduled'
        },
        {
          id: 4,
          patientId: 'N-2012',
          patientName: 'Neha Sharma',
          time: '11:30 AM',
          note: 'MRI review',
          color: '#f59e0b',
          status: 'pending'
        }
      ],
      schedule: [
        {
          id: 3,
          patientId: 'N-2011',
          patientName: 'Amit Sharma',
          time: '10:00 AM',
          note: 'Migraine consultation',
          left: '20%',
          width: '13%',
          bg: '#ede9fe',
          color: '#6d28d9'
        },
        {
          id: 4,
          patientId: 'N-2012',
          patientName: 'Neha Sharma',
          time: '11:30 AM',
          note: 'MRI review',
          left: '35%',
          width: '14%',
          bg: '#fef3c7',
          color: '#b45309'
        }
      ]
    },
    ortho: {
      doctorName: 'Dr. Patel',
      department: 'ORTHO',
      patients: [
        {
          id: 'O-3001',
          name: 'Vikram Singh',
          initials: 'VS',
          caseId: 'CASE-3001',
          priority: 'MEDIUM',
          startDate: 'Today',
          endDate: '—',
          age: 56,
          gender: 'Male',
          reason: 'Knee pain review'
        },
        {
          id: 'O-3002',
          name: 'Pooja Nair',
          initials: 'PN',
          caseId: 'CASE-3002',
          priority: 'HIGH',
          startDate: 'Today',
          endDate: '—',
          age: 34,
          gender: 'Female',
          reason: 'Fracture follow-up'
        }
      ],
      appointments: [
        {
          id: 5,
          patientId: 'O-3001',
          patientName: 'Vikram Singh',
          time: '09:30 AM',
          note: 'Knee pain review',
          color: '#10b981',
          status: 'scheduled'
        },
        {
          id: 6,
          patientId: 'O-3002',
          patientName: 'Pooja Nair',
          time: '03:00 PM',
          note: 'Fracture follow-up',
          color: '#ef4444',
          status: 'pending'
        }
      ],
      schedule: [
        {
          id: 5,
          patientId: 'O-3001',
          patientName: 'Vikram Singh',
          time: '09:30 AM',
          note: 'Knee pain review',
          left: '15%',
          width: '14%',
          bg: '#d1fae5',
          color: '#047857'
        },
        {
          id: 6,
          patientId: 'O-3002',
          patientName: 'Pooja Nair',
          time: '03:00 PM',
          note: 'Fracture follow-up',
          left: '70%',
          width: '13%',
          bg: '#fee2e2',
          color: '#b91c1c'
        }
      ]
    }
  };

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.detectLoggedInDoctor();
    this.loadDoctorDashboardData();
    this.buildCalendarDays();
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

  loadDoctorDashboardData(): void {
    const data = this.doctorSeedData[this.doctorKey];
    this.doctorName = data.doctorName;
    this.doctorDepartment = data.department;
    this.patientRows = [...data.patients];
    this.todayAppointments = [...data.appointments];
    this.todaySchedule = [...data.schedule];
    this.isLoading = false;
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

  selectDate(day: CalendarDay): void {
    if (!day.date) return;
    this.selectedDate = `2026-04-${String(day.date).padStart(2, '0')}`;
    this.calendarDays = this.calendarDays.map(d => ({
      ...d,
      isSelected: d.date === day.date
    }));
  }

  buildCalendarDays(): void {
    const daysInMonth = 30;
    const today = 16;
    this.calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
      const date = i + 1;
      return {
        date,
        isToday: date === today,
        isSelected: date === today,
        hasAppointment: [9, 11, 15, 16, 19, 23, 28].includes(date),
        isPending: [10, 14, 18, 24, 27].includes(date)
      };
    });
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
}
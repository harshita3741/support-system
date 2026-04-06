import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { MedicalCaseService } from '../../services/medical-case';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {

  doctorName = 'Doctor';
  doctorDept = '';
  doctorId = '';
  greeting = 'Good Morning';

  statCards = [
    { label: "Today's Cases", value: '8', sub: '5 resolved today', barColor: '#0d6e6e', lightColor: '#e0f2f1', bars: [12, 18, 10, 22, 14, 30] },
    { label: 'In Queue', value: '3', sub: '2 urgent priority', barColor: '#f59e0b', lightColor: '#fef3c7', bars: [8, 16, 12, 20, 9, 30] },
    { label: 'Avg. Response', value: '12m', sub: 'Target: 15 mins', barColor: '#16a34a', lightColor: '#dcfce7', bars: [18, 22, 14, 26, 20, 30] }
  ];

  filteredPatients: any[] = [];

  filteredAppointments: any[] = [];

  allAppointments: any[] = [
    { time: '09:00', name: 'Priya Mehta', type: 'Follow-up · Arrhythmia', color: '#0d6e6e', dept: 'CARDIO' },
    { time: '10:30', name: 'Rajesh Singh', type: 'Urgent consult', color: '#ef4444', dept: 'CARDIO' },
    { time: '14:30', name: 'Dev Malhotra', type: 'Pre-procedure', color: '#f59e0b', dept: 'CARDIO' },
    { time: '09:00', name: 'Amit Sharma', type: 'Neuro follow-up', color: '#0d6e6e', dept: 'NEURO' },
    { time: '11:00', name: 'Rina Desai', type: 'MRI review', color: '#f59e0b', dept: 'NEURO' },
    { time: '10:00', name: 'Sneha Bhatt', type: 'Post-op review', color: '#0d6e6e', dept: 'ORTHO' },
    { time: '13:00', name: 'Mohit Kumar', type: 'Fracture follow-up', color: '#ef4444', dept: 'ORTHO' }
  ];

  calendarDays: { day: number | null, isToday: boolean, hasAppt: boolean }[] = [];
  apptDays = [2, 5, 9, 12, 14, 17, 19, 23, 24, 26, 30];

  scheduleRows = [
    { day: 'Mon', blocks: [
      { label: 'Check up patient', left: '10%', width: '22%', bg: '#d1fae5', color: '#065f46' },
      { label: 'Lunch Break', left: '33%', width: '12%', bg: '#fee2e2', color: '#991b1b' },
      { label: 'Surgery', left: '46%', width: '30%', bg: '#dbeafe', color: '#1e40af' }
    ]},
    { day: 'Tue', blocks: [
      { label: 'Check up patient', left: '10%', width: '30%', bg: '#d1fae5', color: '#065f46' },
      { label: 'Lunch Break', left: '41%', width: '12%', bg: '#fee2e2', color: '#991b1b' },
      { label: 'Evaluation', left: '54%', width: '22%', bg: '#ede9fe', color: '#5b21b6' }
    ]},
    { day: 'Wed', blocks: [
      { label: 'Patient Review', left: '10%', width: '18%', bg: '#fef9c3', color: '#854d0e' },
      { label: 'Consultation', left: '29%', width: '25%', bg: '#d1fae5', color: '#065f46' },
      { label: 'Team Meeting', left: '55%', width: '20%', bg: '#dbeafe', color: '#1e40af' }
    ]},
    { day: 'Thu', blocks: [
      { label: 'Ward Rounds', left: '10%', width: '35%', bg: '#d1fae5', color: '#065f46' },
      { label: 'Lunch Break', left: '46%', width: '12%', bg: '#fee2e2', color: '#991b1b' },
      { label: 'Case Review', left: '59%', width: '18%', bg: '#ede9fe', color: '#5b21b6' }
    ]}
  ];

  timelineHours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
  weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  constructor(
    private auth: AuthService,
    private caseService: MedicalCaseService
  ) {}

  ngOnInit() {
    const session = this.auth.getSession();
    if (session) {
      this.doctorName = session.name;
      this.doctorDept = session.dept;
      this.doctorId = session.id;
    }

    const hour = new Date().getHours();
    if (hour < 12) this.greeting = 'Good Morning';
    else if (hour < 17) this.greeting = 'Good Afternoon';
    else this.greeting = 'Good Evening';

    this.filteredAppointments = this.allAppointments
      .filter(a => a.dept === this.doctorDept);

    this.buildCalendar();
    this.loadPatients();
  }

  loadPatients() {
    this.caseService.getCasesByDoctor(this.doctorId).subscribe({
      next: (cases: any[]) =>  {
        this.filteredPatients = cases.slice(0, 4).map((c: any) => ({
          id: c.caseId,
          initials: c.patientName?.substring(0, 2).toUpperCase(),
          name: c.patientName,
          age: c.age || '',
          gender: c.gender || '',
          priority: c.priority || 'Medium',
          date: 'Today',
          bg: '#eff6ff',
          color: '#1d4ed8'
        }));

        this.statCards[0].value = cases.length.toString();
        this.statCards[0].sub = cases.filter(
          (c: any) => c.status === 'CLOSED'
        ).length + ' resolved today';

        this.statCards[1].value = cases.filter(
          (c: any) => c.status === 'OPEN'
        ).length.toString();
        this.statCards[1].sub = cases.filter(
          (c: any) => c.priority === 'HIGH'
        ).length + ' urgent priority';
      },
      error: () => {
        this.useDummyData();
      }
    });
  }

  useDummyData() {
    const allDummy: any = {
      CARDIO: [
        { id: 'C-1042', initials: 'PM', name: 'Priya Mehta', age: 52, gender: 'F', priority: 'Medium', date: 'Mar 1, 2026', bg: '#fff8f0', color: '#c2410c' },
        { id: 'C-1038', initials: 'RS', name: 'Rajesh Singh', age: 61, gender: 'M', priority: 'High', date: 'Mar 3, 2026', bg: '#fef2f2', color: '#b91c1c' },
        { id: 'C-1035', initials: 'AL', name: 'Aisha Lakhani', age: 44, gender: 'F', priority: 'Low', date: 'Feb 28, 2026', bg: '#fdf4ff', color: '#7e22ce' },
        { id: 'C-1030', initials: 'VG', name: 'Vikram Gupta', age: 57, gender: 'M', priority: 'Medium', date: 'Mar 5, 2026', bg: '#eff6ff', color: '#1d4ed8' }
      ],
      NEURO: [
        { id: 'N-2011', initials: 'AS', name: 'Amit Sharma', age: 45, gender: 'M', priority: 'High', date: 'Mar 2, 2026', bg: '#fef2f2', color: '#b91c1c' },
        { id: 'N-2012', initials: 'RD', name: 'Rina Desai', age: 38, gender: 'F', priority: 'Medium', date: 'Mar 4, 2026', bg: '#eff6ff', color: '#1d4ed8' },
        { id: 'N-2013', initials: 'KP', name: 'Karan Patel', age: 52, gender: 'M', priority: 'Low', date: 'Mar 6, 2026', bg: '#f0fdf4', color: '#15803d' }
      ],
      ORTHO: [
        { id: 'O-3011', initials: 'SB', name: 'Sneha Bhatt', age: 29, gender: 'F', priority: 'Medium', date: 'Mar 1, 2026', bg: '#fff8f0', color: '#c2410c' },
        { id: 'O-3012', initials: 'MK', name: 'Mohit Kumar', age: 41, gender: 'M', priority: 'High', date: 'Mar 3, 2026', bg: '#fef2f2', color: '#b91c1c' },
        { id: 'O-3013', initials: 'PJ', name: 'Pooja Jain', age: 55, gender: 'F', priority: 'Low', date: 'Mar 7, 2026', bg: '#f0fdf4', color: '#15803d' }
      ]
    };

    this.filteredPatients = allDummy[this.doctorDept] || allDummy['CARDIO'];
    this.statCards[0].value = '8';
    this.statCards[0].sub = '5 resolved today';
    this.statCards[1].value = '3';
    this.statCards[1].sub = '2 urgent priority';
  }

  buildCalendar() {
    const blanks = 4;
    for (let i = 1 - blanks; i <= 31; i++) {
      if (i < 1 || i > 31) {
        this.calendarDays.push({ day: null, isToday: false, hasAppt: false });
      } else {
        this.calendarDays.push({
          day: i,
          isToday: i === 30,
          hasAppt: this.apptDays.includes(i)
        });
      }
    }
  }

  getPriorityClass(priority: string): string {
    if (priority === 'High' || priority === 'HIGH') return 'prio-high';
    if (priority === 'Low' || priority === 'LOW') return 'prio-low';
    return 'prio-medium';
  }
}
import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { MedicalCaseService } from '../../services/medical-case';
import { AppointmentService, Appointment } from '../../services/appointment.service';

type CalendarDay = {
  day: number | null;
  isToday: boolean;
  hasAppt: boolean;
  fullDate?: string;
};

type TimelineBlock = {
  label: string;
  left: string;
  width: string;
  bg: string;
  color: string;
  time?: string;
  type?: string;
};

type ScheduleRow = {
  day: string;
  blocks: TimelineBlock[];
};

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

  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  shortMonthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  currentMonthIndex = new Date().getMonth();
  currentYear = new Date().getFullYear();
  currentMonthLabel = '';
  scheduleMonthLabel = '';

  statCards = [
    { label: "Today's Cases", value: '0', sub: '0 resolved today', barColor: '#0d6e6e', lightColor: '#e0f2f1', bars: [12, 18, 10, 22, 14, 30] },
    { label: 'In Queue', value: '0', sub: '0 urgent priority', barColor: '#f59e0b', lightColor: '#fef3c7', bars: [8, 16, 12, 20, 9, 30] },
    { label: 'Avg. Response', value: '12m', sub: 'Target: 15 mins', barColor: '#16a34a', lightColor: '#dcfce7', bars: [18, 22, 14, 26, 20, 30] }
  ];

  filteredPatients: any[] = [];
  filteredAppointments: any[] = [];

  calendarDays: CalendarDay[] = [];
  realAppointments: Appointment[] = [];
  todaysAppointments: TimelineBlock[] = [];
  calendarAppointmentDates: string[] = [];
  selectedDateAppointments: Appointment[] = [];
  selectedDate = '';

  monthPickerOpen = false;

  monthOptions = [
    { index: 0, label: 'January 2026' },
    { index: 1, label: 'February 2026' },
    { index: 2, label: 'March 2026' },
    { index: 3, label: 'April 2026' },
    { index: 4, label: 'May 2026' },
    { index: 5, label: 'June 2026' },
    { index: 6, label: 'July 2026' },
    { index: 7, label: 'August 2026' },
    { index: 8, label: 'September 2026' },
    { index: 9, label: 'October 2026' },
    { index: 10, label: 'November 2026' },
    { index: 11, label: 'December 2026' }
  ];

  timelineHours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];
  weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  scheduleRows: ScheduleRow[] = [];

  constructor(
    private auth: AuthService,
    private caseService: MedicalCaseService,
    private appointmentService: AppointmentService
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

    this.updateLabels();
    this.buildCalendar();
    this.loadPatients();
    this.loadAppointments();
  }

  @HostListener('document:click')
  closeMonthPickerOnOutsideClick() {
    this.monthPickerOpen = false;
  }

  updateLabels() {
    this.currentMonthLabel = `${this.monthNames[this.currentMonthIndex]} ${this.currentYear}`;
    this.scheduleMonthLabel = `${this.shortMonthNames[this.currentMonthIndex]} ${this.currentYear}`;
  }

  toggleMonthPicker(event?: MouseEvent) {
    if (event) event.stopPropagation();
    this.monthPickerOpen = !this.monthPickerOpen;
  }

  changeMonth(step: number) {
    this.currentMonthIndex += step;

    if (this.currentMonthIndex < 0) {
      this.currentMonthIndex = 11;
      this.currentYear--;
    } else if (this.currentMonthIndex > 11) {
      this.currentMonthIndex = 0;
      this.currentYear++;
    }

    this.updateLabels();
    this.buildCalendarForCurrentData();
    this.selectedDateAppointments = [];
    this.filteredAppointments = [];
    this.selectedDate = '';
    this.monthPickerOpen = false;
  }

  selectMonth(monthIndex: number, event?: MouseEvent) {
    if (event) event.stopPropagation();
    this.currentMonthIndex = monthIndex;
    this.updateLabels();
    this.buildCalendarForCurrentData();
    this.selectedDateAppointments = [];
    this.filteredAppointments = [];
    this.selectedDate = '';
    this.monthPickerOpen = false;
  }

  loadPatients() {
    this.caseService.getCasesByDoctor(this.doctorId).subscribe({
      next: (cases: any[]) => {
        this.filteredPatients = cases.slice(0, 4).map((c: any) => ({
          id: c.caseId,
          name: c.patientName,
          initials: c.patientName?.substring(0, 2).toUpperCase(),
          age: c.age || '--',
          gender: c.gender || '--',
          priority: c.priority || 'Medium',
          date: 'Today',
          bg: '#eff6ff',
          color: '#1d4ed8'
        }));

        this.statCards[0].value = cases.length.toString();
        this.statCards[0].sub = `${cases.filter((c: any) => c.status === 'CLOSED').length} resolved today`;
        this.statCards[1].value = cases.filter((c: any) => c.status === 'OPEN').length.toString();
        this.statCards[1].sub = `${cases.filter((c: any) => c.priority === 'HIGH').length} urgent priority`;
      },
      error: () => this.useDummyData()
    });
  }

  loadAppointments() {
    const doctorIdNum = Number(this.doctorId);
    if (!doctorIdNum) return;

    this.appointmentService.getAppointmentsByDoctor(doctorIdNum).subscribe({
      next: (appointments: Appointment[]) => {
        this.realAppointments = appointments || [];
        this.calendarAppointmentDates = [...new Set(this.realAppointments.map(a => a.date))];

        this.syncTimelineWithAppointments();
        this.buildCalendarForCurrentData();

        const todayStr = this.toYMD(new Date());
        const hasToday = this.realAppointments.some(a => a.date === todayStr);

        if (hasToday) {
          this.selectedDate = todayStr;
          this.selectCalendarDate(todayStr);
        } else if (this.realAppointments.length > 0) {
          const firstSortedDate = [...this.realAppointments]
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0]?.date;

          if (firstSortedDate) {
            this.selectedDate = firstSortedDate;
            this.selectCalendarDate(firstSortedDate);
          }
        } else {
          this.selectedDate = '';
          this.selectedDateAppointments = [];
          this.filteredAppointments = [];
        }
      },
      error: () => {
        this.realAppointments = [];
        this.calendarAppointmentDates = [];
        this.todaysAppointments = [];
        this.scheduleRows = [];
        this.selectedDateAppointments = [];
        this.filteredAppointments = [];
        this.buildCalendarForCurrentData();
      }
    });
  }

  syncTimelineWithAppointments() {
    const todayStr = this.toYMD(new Date());

    this.todaysAppointments = this.realAppointments
      .filter(a => a.date === todayStr)
      .sort((a, b) => this.timeSlotToHour(a.timeSlot) - this.timeSlotToHour(b.timeSlot))
      .map(a => ({
        label: a.patientName || 'Patient',
        time: a.timeSlot,
        type: a.reason || 'Appointment',
        left: this.calculatePosition(a.timeSlot),
        width: '12%',
        bg: this.getTimelineBg(a.status || 'SCHEDULED'),
        color: this.getTimelineText(a.status || 'SCHEDULED')
      }));

    this.scheduleRows = [
      {
        day: 'Today',
        blocks: this.todaysAppointments
      }
    ];

    this.statCards[2].value = this.todaysAppointments.length > 0 ? 'Live' : '—';
    this.statCards[2].sub = this.todaysAppointments.length > 0
      ? `${this.todaysAppointments.length} appointments today`
      : 'No appointments today';
  }

  private calculatePosition(timeSlot: string): string {
    const hour = this.timeSlotToHour(timeSlot);
    const startRange = 8;
    const endRange = 18;
    const pct = ((hour - startRange) / (endRange - startRange)) * 100;
    return `${Math.max(0, Math.min(pct, 100))}%`;
  }

  private timeSlotToHour(timeSlot: string): number {
    if (!timeSlot) return 8;

    const [time, period] = timeSlot.trim().split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours + (minutes === 30 ? 0.5 : 0);
  }

  private getTimelineBg(status: string): string {
    switch (status) {
      case 'COMPLETED': return '#dcfce7';
      case 'CANCELLED': return '#fee2e2';
      case 'PENDING': return '#fef3c7';
      case 'SCHEDULED':
      default: return '#dbeafe';
    }
  }

  private getTimelineText(status: string): string {
    switch (status) {
      case 'COMPLETED': return '#166534';
      case 'CANCELLED': return '#991b1b';
      case 'PENDING': return '#92400e';
      case 'SCHEDULED':
      default: return '#1e3a8a';
    }
  }

  getAppointmentColor(status: string): string {
    switch (status) {
      case 'SCHEDULED': return '#635bff';
      case 'COMPLETED': return '#16a34a';
      case 'CANCELLED': return '#ef4444';
      case 'PENDING': return '#f59e0b';
      default: return '#0d6e6e';
    }
  }

  useDummyData() {
    const allDummy: any = {
      CARDIO: [
        { id: 'C-1042', initials: 'PM', name: 'Priya Mehta', age: 52, gender: 'F', priority: 'Medium', date: 'Mar 1, 2026', bg: '#fff8f0', color: '#c2410c' },
        { id: 'C-1038', initials: 'RS', name: 'Rajesh Singh', age: 61, gender: 'M', priority: 'High', date: 'Mar 3, 2026', bg: '#fef2f2', color: '#b91c1c' },
        { id: 'C-1035', initials: 'AL', name: 'Aisha Lakhani', age: 44, gender: 'F', priority: 'Low', date: 'Mar 28, 2026', bg: '#fdf4ff', color: '#7e22ce' },
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
    this.calendarDays = [];
    const firstDay = new Date(this.currentYear, this.currentMonthIndex, 1);
    const startDay = firstDay.getDay();
    const blanks = startDay === 0 ? 6 : startDay - 1;
    const daysInMonth = new Date(this.currentYear, this.currentMonthIndex + 1, 0).getDate();

    for (let i = 0; i < blanks; i++) {
      this.calendarDays.push({ day: null, isToday: false, hasAppt: false });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const monthStr = String(this.currentMonthIndex + 1).padStart(2, '0');
      const fullDate = `${this.currentYear}-${monthStr}-${dayStr}`;

      const today = new Date();
      const isToday =
        today.getFullYear() === this.currentYear &&
        today.getMonth() === this.currentMonthIndex &&
        today.getDate() === day;

      this.calendarDays.push({
        day,
        isToday,
        hasAppt: this.calendarAppointmentDates.includes(fullDate),
        fullDate
      });
    }
  }

  buildCalendarForCurrentData() {
    this.buildCalendar();
  }

  hasAppointmentOnDate(fullDate: string): boolean {
    return this.calendarAppointmentDates.includes(fullDate);
  }

  selectCalendarDate(fullDate: string) {
    this.selectedDate = fullDate;
    this.selectedDateAppointments = this.realAppointments
      .filter(a => a.date === fullDate)
      .sort((a, b) => this.timeSlotToHour(a.timeSlot) - this.timeSlotToHour(b.timeSlot));

    this.filteredAppointments = this.selectedDateAppointments.map(a => ({
      time: a.timeSlot,
      name: a.patientName,
      type: a.reason || 'Appointment',
      color: this.getAppointmentColor(a.status || 'SCHEDULED')
    }));
  }

  getPriorityClass(priority: string): string {
    if (priority === 'High' || priority === 'HIGH') return 'prio-high';
    if (priority === 'Low' || priority === 'LOW') return 'prio-low';
    return 'prio-medium';
  }

  private toYMD(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
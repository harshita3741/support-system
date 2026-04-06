import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './schedule.html',
  styleUrl: './schedule.css'
})
export class Schedule {
  hours = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00'];

  rows = [
    { day: 'Mon', blocks: [
      { label: 'Check up patient', left: '10%', width: '22%', bg: '#d1fae5', color: '#065f46' },
      { label: 'Lunch Break', left: '33%', width: '12%', bg: '#fee2e2', color: '#991b1b' },
      { label: 'Heart Surgery', left: '46%', width: '30%', bg: '#dbeafe', color: '#1e40af' }
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
    ]},
    { day: 'Fri', blocks: [
      { label: 'ECG Review', left: '10%', width: '20%', bg: '#fef9c3', color: '#854d0e' },
      { label: 'Outpatient Clinic', left: '31%', width: '28%', bg: '#d1fae5', color: '#065f46' },
      { label: 'Discharge', left: '60%', width: '15%', bg: '#dbeafe', color: '#1e40af' }
    ]}
  ];
}
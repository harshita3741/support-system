import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-appointment',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './appointment.html',
  styleUrls: ['./appointment.css']
})
export class AppointmentComponent {

  doctors = [
    { initials: 'RS', name: 'Dr. Riya Sharma', spec: 'General Physician', color: '#6c63ff' },
    { initials: 'AK', name: 'Dr. Arjun Kapoor', spec: 'Cardiologist', color: '#1d9e75' },
    { initials: 'PM', name: 'Dr. Priya Mehta', spec: 'Dermatologist', color: '#d85a30' },
  ];

  slots = [
    { time: '9:00 AM', taken: true },
    { time: '9:30 AM', taken: true },
    { time: '10:00 AM', taken: false },
    { time: '10:30 AM', taken: false },
    { time: '11:00 AM', taken: false },
    { time: '11:30 AM', taken: true },
    { time: '2:00 PM', taken: false },
    { time: '2:30 PM', taken: false },
    { time: '3:00 PM', taken: false },
  ];

  selectedDoctor = 0;
  selectedSlot = '10:00 AM';
  selectedDay = 9;

  days = ['', '', 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30];

  selectDoctor(i: number) { this.selectedDoctor = i; }
  selectSlot(slot: any) { if (!slot.taken) this.selectedSlot = slot.time; }
  selectDay(day: any) { if (day) this.selectedDay = day; }

  confirm() {
    alert(`Appointment confirmed with ${this.doctors[this.selectedDoctor].name} on April ${this.selectedDay} at ${this.selectedSlot}`);
  }
}
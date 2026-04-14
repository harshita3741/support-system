import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-appointment',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './appointment.html',
  styleUrls: ['./appointment.css']
})
export class AppointmentComponent implements OnInit {

  doctors: any[] = [];
  slots: any[] = [];
  selectedDoctor = 0;
  selectedSlot = '';
  selectedDay = 9;
  initials = '';

  days = ['','',1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {
    const name = localStorage.getItem('patientName') || '';
    this.initials = name.split('@')[0].split('.')
      .map((p: string) => p[0]?.toUpperCase()).join('').slice(0, 2) || 'PT';
  }

  ngOnInit() {
    this.loadDoctors();
  }

  loadDoctors() {
    this.http.get<any[]>('http://localhost:8080/doctors').subscribe({
      next: (res) => {
        console.log('Doctors loaded:', res);
        this.doctors = res.map(d => ({
          id:       d.doctorId,
          initials: d.name.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase(),
          name:     d.name,
          spec:     d.specialty,
          color:    this.getColor(d.specialty)
        }));
        this.cdr.detectChanges();
        if (this.doctors.length > 0) this.loadSlots(0);
      },
      error: (err) => console.error('Failed to load doctors:', err)
    });
  }

  loadSlots(index: number) {
    const doctorId = this.doctors[index].id;
    this.http.get<any[]>(`http://localhost:8080/appointments/slots/${doctorId}`).subscribe({
      next: (res) => {
        console.log('Slots loaded:', res);
        this.slots = res.map(s => ({
          id:    s.id,
          time:  this.formatTime(s.slotTime),
          raw:   s.slotTime,
          taken: s.booked
        }));
        this.selectedSlot = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load slots:', err);
        this.slots = [];
      }
    });
  }

  selectDoctor(i: number) {
    this.selectedDoctor = i;
    this.selectedSlot = '';
    this.loadSlots(i);
  }

  selectSlot(slot: any) { if (!slot.taken) this.selectedSlot = slot.time; }
  selectDay(day: any)   { if (day) this.selectedDay = day; }

  confirm() {
    if (!this.selectedSlot) { alert('Please select a time slot.'); return; }
    const selected = this.slots.find(s => s.time === this.selectedSlot);
    if (!selected) return;

    const payload = {
      patientName:     localStorage.getItem('patientName') || 'Patient',
      department:      this.doctors[this.selectedDoctor].spec,
      reason:          'Appointment - ' + this.doctors[this.selectedDoctor].spec,
      appointmentTime: selected.raw
    };

    this.http.post('http://localhost:8080/appointments/book', payload).subscribe({
      next: () => {
        selected.taken = true;
        this.selectedSlot = '';
        this.cdr.detectChanges();
        alert(`Appointment confirmed with ${this.doctors[this.selectedDoctor].name} at ${selected.time}`);
      },
      error: () => alert('Could not book appointment.')
    });
  }

  formatTime(slotTime: string): string {
    const date = new Date(slotTime);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  getColor(specialty: string): string {
    const map: any = { 'CARDIO': '#1d9e75', 'NEURO': '#6c63ff', 'ORTHO': '#d85a30' };
    return map[specialty] || '#888';
  }
}
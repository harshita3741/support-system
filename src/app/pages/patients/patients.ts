import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './patients.html',
  styleUrl: './patients.css'
})
export class Patients implements OnInit {

  isNurse = false;
  editingId: any = null;
  editStatus = '';
  editNotes = '';

  patients = [
    { id: 'C-1042', initials: 'PM', name: 'Priya Mehta', age: 52, gender: 'F', dept: 'CARDIO', symptoms: 'Irregular heartbeat, dizziness', priority: 'Medium', status: 'Open', date: 'Mar 1, 2026', bg: '#fff8f0', color: '#c2410c', notes: '' },
    { id: 'C-1038', initials: 'RS', name: 'Rajesh Singh', age: 61, gender: 'M', dept: 'CARDIO', symptoms: 'Chest pain on exertion', priority: 'High', status: 'Urgent', date: 'Mar 3, 2026', bg: '#fef2f2', color: '#b91c1c', notes: '' },
    { id: 'C-1035', initials: 'AL', name: 'Aisha Lakhani', age: 44, gender: 'F', dept: 'CARDIO', symptoms: 'Palpitations, fatigue', priority: 'Low', status: 'Resolved', date: 'Feb 28, 2026', bg: '#fdf4ff', color: '#7e22ce', notes: '' },
    { id: 'C-1030', initials: 'VG', name: 'Vikram Gupta', age: 57, gender: 'M', dept: 'CARDIO', symptoms: 'Shortness of breath', priority: 'Medium', status: 'Open', date: 'Mar 5, 2026', bg: '#eff6ff', color: '#1d4ed8', notes: '' },
    { id: 'N-2011', initials: 'AS', name: 'Amit Sharma', age: 45, gender: 'M', dept: 'NEURO', symptoms: 'Severe headaches', priority: 'High', status: 'Open', date: 'Mar 2, 2026', bg: '#fef2f2', color: '#b91c1c', notes: '' },
    { id: 'N-2012', initials: 'RD', name: 'Rina Desai', age: 38, gender: 'F', dept: 'NEURO', symptoms: 'Memory loss', priority: 'Medium', status: 'Open', date: 'Mar 4, 2026', bg: '#eff6ff', color: '#1d4ed8', notes: '' },
    { id: 'O-3011', initials: 'SB', name: 'Sneha Bhatt', age: 29, gender: 'F', dept: 'ORTHO', symptoms: 'Knee pain', priority: 'Medium', status: 'Open', date: 'Mar 1, 2026', bg: '#fff8f0', color: '#c2410c', notes: '' },
    { id: 'O-3012', initials: 'MK', name: 'Mohit Kumar', age: 41, gender: 'M', dept: 'ORTHO', symptoms: 'Back injury', priority: 'High', status: 'Urgent', date: 'Mar 3, 2026', bg: '#fef2f2', color: '#b91c1c', notes: '' }
  ];

  filteredPatients: any[] = [];

  constructor(private auth: AuthService) {}

  ngOnInit() {
    this.isNurse = this.auth.isNurse();
    const session = this.auth.getSession();
    const dept = session?.dept || '';
    this.filteredPatients = this.patients.filter(p => p.dept === dept);
  }

  startEdit(p: any) {
    this.editingId = p.id;
    this.editStatus = p.status;
    this.editNotes = p.notes;
  }

  saveEdit(p: any) {
    p.status = this.editStatus;
    p.notes = this.editNotes;
    this.editingId = null;
  }

  cancelEdit() {
    this.editingId = null;
  }

  getPriorityClass(p: string) {
    if (p === 'High') return 'prio-high';
    if (p === 'Low') return 'prio-low';
    return 'prio-medium';
  }

  getStatusClass(s: string) {
    if (s === 'Urgent') return 'status-urgent';
    if (s === 'Resolved') return 'status-done';
    return 'status-open';
  }
}
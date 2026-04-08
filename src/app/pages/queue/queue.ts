import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MedicalCaseService } from '../../services/medical-case';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-queue',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './queue.html',
  styleUrl: './queue.css'
})
export class Queue implements OnInit {

  queueItems: any[] = [];
  loading = true;
  errorMessage = '';

  constructor(
    private router: Router,
    private medicalCaseService: MedicalCaseService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const doctor = this.authService.getSession();

    if (!doctor || !doctor.id) {
      this.loading = false;
      this.errorMessage = 'Doctor session not found';
      return;
    }

    this.medicalCaseService.getCasesByDoctor(doctor.id).subscribe({
      next: (data: any) => {
        this.queueItems = Array.isArray(data) ? data : [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching queue:', err);
        this.queueItems = [];
        this.loading = false;
        this.errorMessage = 'Unable to load queue';
      }
    });
  }

  acceptPatient(patient: any) {
  console.log('Accept clicked for:', patient.patientName);
  localStorage.setItem('activePatient', JSON.stringify(patient));
  this.router.navigate(['/call']).then(() => {
    console.log('Successfully navigated to /call');
  }).catch(err => {
    console.error('Navigation failed:', err);
  });
}

  getPriorityClass(priority: string) {
    if (!priority) return 'prio-medium';
    const p = priority.toLowerCase();
    if (p === 'high') return 'prio-high';
    if (p === 'low') return 'prio-low';
    return 'prio-medium';
  }

  getStatusClass(status: string) {
    if (!status) return 'wait-medium';
    const s = status.toLowerCase();
    if (s === 'open') return 'wait-high';
    if (s === 'accepted') return 'wait-medium';
    return 'wait-low';
  }

  getInitials(name: string): string {
    if (!name) return 'P';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }

  getAvatarBg(priority: string): string {
    if (!priority) return '#eff6ff';
    const p = priority.toLowerCase();
    if (p === 'high') return '#fef2f2';
    if (p === 'low') return '#f0fdf4';
    return '#eff6ff';
  }

  getAvatarColor(priority: string): string {
    if (!priority) return '#1d4ed8';
    const p = priority.toLowerCase();
    if (p === 'high') return '#b91c1c';
    if (p === 'low') return '#15803d';
    return '#1d4ed8';
  }
}

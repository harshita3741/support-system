import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

type DoctorKey = 'cardio' | 'neuro' | 'ortho';

type PatientItem = {
  id: string;
  name: string;
  initials: string;
  age: number;
  gender: string;
  caseId: string;
  reason: string;
};

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './patients.html',
  styleUrls: ['./patients.css']
})
export class Patients implements OnInit {
  doctorKey: DoctorKey = 'cardio';
  patients: PatientItem[] = [];
  sortAsc = true;

  get sortLabel(): string { return this.sortAsc ? 'A–Z' : 'Z–A'; }

  seedPatients: Record<DoctorKey, PatientItem[]> = {
    cardio: [
      { id: 'C-1042', name: 'Priya Mehta',  initials: 'PM', age: 52, gender: 'Female', caseId: 'CASE-1001', reason: 'Cardiac follow-up' },
      { id: 'C-1043', name: 'Rohan Verma',  initials: 'RV', age: 48, gender: 'Male',   caseId: 'CASE-1002', reason: 'Post-op check' }
    ],
    neuro: [
      { id: 'N-2011', name: 'Amit Sharma',  initials: 'AS', age: 45, gender: 'Male',   caseId: 'CASE-2001', reason: 'Migraine review' },
      { id: 'N-2012', name: 'Neha Sharma',  initials: 'NS', age: 39, gender: 'Female', caseId: 'CASE-2002', reason: 'MRI review' }
    ],
    ortho: [
      { id: 'O-3001', name: 'Vikram Singh', initials: 'VS', age: 56, gender: 'Male',   caseId: 'CASE-3001', reason: 'Knee pain review' },
      { id: 'O-3002', name: 'Pooja Nair',   initials: 'PN', age: 34, gender: 'Female', caseId: 'CASE-3002', reason: 'Fracture follow-up' }
    ]
  };

  constructor(private router: Router) {}

  ngOnInit(): void {
    const storedDept = (localStorage.getItem('doctorDepartment') || '').toLowerCase();
    if (storedDept.includes('neuro')) this.doctorKey = 'neuro';
    else if (storedDept.includes('ortho')) this.doctorKey = 'ortho';
    else this.doctorKey = 'cardio';

    this.patients = [...this.seedPatients[this.doctorKey]];
  }

  sortPatients(): void {
    this.sortAsc = !this.sortAsc;
    this.patients = [...this.patients].sort((a, b) =>
      this.sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );
  }

  avatarColor(id: string): string {
    // Deterministic color bucket from id
    if (id.startsWith('C')) return 'blue';
    if (id.startsWith('N')) return 'purple';
    return 'green';
  }

  openPatient(patientId: string): void {
    if (!patientId) return;
    this.router.navigate(['/monitor', patientId]);
  }
}
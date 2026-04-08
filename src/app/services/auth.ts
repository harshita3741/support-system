import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {

  
  private baseUrl = 'http://192.168.1.76:8080';

  private mockDoctors = [
  { username: 'dr.smith', password: '1234', name: 'Dr. Smith', dept: 'CARDIO', id: '1', role: 'DOCTOR' },
  { username: 'dr.adams', password: '1234', name: 'Dr. Adams', dept: 'NEURO', id: '2', role: 'DOCTOR' },
  { username: 'dr.lee', password: '1234', name: 'Dr. Lee', dept: 'ORTHO', id: '3', role: 'DOCTOR' },
  { username: 'nurse.cardio', password: '1234', name: 'Nurse Priya', dept: 'CARDIO', id: '4', role: 'NURSE' },
  { username: 'nurse.neuro', password: '1234', name: 'Nurse Rahul', dept: 'NEURO', id: '5', role: 'NURSE' },
  { username: 'nurse.ortho', password: '1234', name: 'Nurse Sneha', dept: 'ORTHO', id: '6', role: 'NURSE' }
  ];

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<any> {
    const doctor = this.mockDoctors.find(
      d => d.username === username && d.password === password
    );

    if (doctor) {
      return of({
        success: true,
        id: doctor.id,
        name: doctor.name,
        dept: doctor.dept,
        username: doctor.username
      });
    }

    return of({
      success: false,
      message: 'Invalid username or password'
    });
  }

  saveSession(doctor: any) {
    localStorage.setItem('doctor', JSON.stringify(doctor));
  }

  getSession() {
    const d = localStorage.getItem('doctor');
    return d ? JSON.parse(d) : null;
  }
  getRole(): string {
  const session = this.getSession();
  return session ? session.role : '';
}

isNurse(): boolean {
  return this.getRole() === 'NURSE';
}

isDoctor(): boolean {
  return this.getRole() === 'DOCTOR';
}

  isLoggedIn(): boolean {
    return !!localStorage.getItem('doctor');
  }

  logout() {
    localStorage.removeItem('doctor');
  }
}
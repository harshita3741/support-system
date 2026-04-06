import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {

  login(data: any) {
    localStorage.setItem('token', 'dummy');
    localStorage.setItem('patientName', data.email);
  }

  logout() {
    localStorage.clear();
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getPatientName(): string {
    return localStorage.getItem('patientName') || 'User';
  }
}
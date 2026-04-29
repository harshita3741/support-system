import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Appointment {
  id?: number;
  patientName: string;
  patientId?: string;
  doctorId: number;
  doctorName: string;
  department: string;
  reason: string;
  appointmentTime: string; // ISO: "2026-04-22T09:00:00"
  status?: string;
  // Derived fields (computed from appointmentTime)
  date?: string;      // YYYY-MM-DD
  timeSlot?: string;  // HH:MM AM/PM
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {

  private baseUrl = 'http://192.168.1.76:8080';

  constructor(private http: HttpClient) {}

  createAppointment(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/appointments/book`, payload);
  }

  getAppointmentsByDoctor(doctorId: number): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.baseUrl}/appointments/doctor/${doctorId}`);
  }

  getAppointmentsByDoctorAndDate(doctorId: number, date: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.baseUrl}/appointments/doctor/${doctorId}/date/${date}`);
  }
}

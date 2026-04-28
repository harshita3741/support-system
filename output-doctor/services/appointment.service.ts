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
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {

  private baseUrl = 'http://localhost:8080';

  constructor(private http: HttpClient) {}

  createAppointment(payload: Appointment): Observable<any> {
    return this.http.post(`${this.baseUrl}/appointments/book`, payload);
  }

  getAppointmentsByDoctor(doctorId: number): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.baseUrl}/appointments/doctor/${doctorId}`);
  }

  getAppointmentsByPatient(patientName: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.baseUrl}/appointments/patient/${patientName}`);
  }
}

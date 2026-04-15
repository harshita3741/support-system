import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Appointment {
  id?: number;
  patientName: string;
  patientEmail: string;
  doctorId: number;
  doctorName: string;
  department: string;
  date: string;
  timeSlot: string;
  reason: string;
  status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {

  private baseUrl = 'http://192.168.1.5:8080';

  constructor(private http: HttpClient) {}

  createAppointment(payload: Appointment): Observable<any> {
    return this.http.post(`${this.baseUrl}/appointments/create`, payload);
  }

  getAppointmentsByDoctor(doctorId: number): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.baseUrl}/appointments/doctor/${doctorId}`);
  }

  getAppointmentsByDoctorAndDate(doctorId: number, date: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.baseUrl}/appointments/doctor/${doctorId}/date/${date}`);
  }
}
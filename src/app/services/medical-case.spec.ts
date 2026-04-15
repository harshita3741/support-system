// src/app/services/appointment.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Appointment {
  id?: number;
  patientName: string;
  timeSlot: string; // "10:00 AM"
  date: string;     // "2026-04-14"
  type: 'video' | 'hospital' | 'home' | 'audio' | 'in-person';
  status: 'pending' | 'completed' | 'cancelled';
  priority: 'urgent' | 'normal' | 'low';
}

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private baseUrl = 'http://192.168.1.76:8080/api/appointments';

  constructor(private http: HttpClient) {}

  getAppointmentsByDoctor(doctorId: number): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.baseUrl}/doctor/${doctorId}`);
  }
}
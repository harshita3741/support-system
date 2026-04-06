import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MedicalCaseService {

  private baseUrl = 'http://localhost:8080';

  constructor(private http: HttpClient) {}

  getCasesByDoctor(doctorId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/cases/doctor/${doctorId}`);
  }

  getAllCases(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/cases`);
  }

  createCase(medicalCase: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/cases/create`, medicalCase);
  }
}
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MedicalCaseService {

  private baseUrl = 'http://192.168.1.5:8080';

  constructor(private http: HttpClient) {}

  getQueue(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/cases/queue`);
  }

  getCasesByDoctor(doctorId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/cases/doctor/${doctorId}`);
  }

  getCaseById(caseId: string | number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/cases/${caseId}`);
  }

  getCaseStatus(caseId: string | number): Observable<{ status: string; caseId: string }> {
    return this.http.get<any>(`${this.baseUrl}/cases/${caseId}/status`);
  }

  acceptCase(caseId: string | number, doctorId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/cases/${caseId}/accept`, { doctorId });
  }

  getAllCases(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/cases`);
  }

  createCase(medicalCase: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/cases/create`, medicalCase);
  }
}
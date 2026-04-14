import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-case-history',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './case-history.html',
  styleUrls: ['./case-history.css']
})
export class CaseHistoryComponent implements OnInit {

  cases: any[] = [];
  loading = true;
  initials = '';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    const name = localStorage.getItem('patientName') || '';
    this.initials = name.split('@')[0].split('.')
      .map((p: string) => p[0]?.toUpperCase()).join('').slice(0, 2) || 'PT';

    this.http.get<any[]>('http://localhost:8080/cases/queue').subscribe({
      next: (res) => { this.cases = res; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  getDeptColor(dept: string): string {
    const map: any = { 'CARDIO': '#1d9e75', 'NEURO': '#6c63ff', 'ORTHO': '#d85a30' };
    return map[dept] || '#888';
  }

  logout() { localStorage.clear(); this.router.navigate(['/login']); }
}
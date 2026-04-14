import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class ProfileComponent implements OnInit {

  patient: any = null;
  loading = true;
  initials = '';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    const patientId = localStorage.getItem('patientId');
    const name = localStorage.getItem('patientName') || '';
    this.initials = name.split('@')[0].split('.')
      .map((p: string) => p[0]?.toUpperCase()).join('').slice(0, 2) || 'PT';

    if (patientId) {
      this.http.get<any>(`http://localhost:8080/patients/${patientId}`).subscribe({
        next: (res) => { this.patient = res; this.loading = false; },
        error: () => { this.loading = false; }
      });
    } else {
      this.loading = false;
    }
  }

  logout() { localStorage.clear(); this.router.navigate(['/login']); }
}
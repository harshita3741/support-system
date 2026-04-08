import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent {
  name = '';
  initials = '';
  constructor(private auth: AuthService) {
    this.name = this.auth.getPatientName();
    const parts = this.name.split('@')[0].split('.');
    this.initials = parts.map((p: string) => p[0]?.toUpperCase()).join('').slice(0, 2);
  }
}
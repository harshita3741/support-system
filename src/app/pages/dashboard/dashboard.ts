import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  name = '';
  initials = '';

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.name = this.auth.getPatientName();
    const parts = this.name.split(' ');
    this.initials = parts.map((p: string) => p[0]?.toUpperCase()).join('').slice(0, 2);
  }

  logout() {
    this.auth.logout();
  }

  navigate(page: string) {
    this.router.navigate(['/' + page]);
  }
}
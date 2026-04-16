import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css'
})
export class Topbar implements OnInit {
  doctorName = '';
  doctorDept = '';
  initials = '';

  deptLabels: any = {
    CARDIO: 'Cardiologist',
    NEURO: 'Neurologist',
    ORTHO: 'Orthopedist'
  };

  constructor(private auth: AuthService) {}

  ngOnInit() {
    const session = this.auth.getSession();
    if (session) {
      this.doctorName = session.name;
      this.doctorDept = this.deptLabels[session.dept] || session.dept;
      this.initials = session.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .replace('Dr.', '')
        .trim()
        .substring(0, 2)
        .toUpperCase();
    }
  }
}
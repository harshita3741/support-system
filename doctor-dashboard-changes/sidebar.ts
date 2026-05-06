import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar implements OnInit {
  isOnline = true;
  doctorName = 'Doctor';
  doctorDept = '';

  navItems = [
    { label: 'Dashboard',     icon: '⊞',  route: '/dashboard'    },
    { label: 'Patients',      icon: '👤',  route: '/patients'     },
    { label: 'Schedule',      icon: '📅',  route: '/schedule'     },
    { label: 'Availability',  icon: '🟢',  route: '/availability' },
    { label: 'Patient Monitor', icon: '♥', route: ['/monitor', 'C-1042'] },
    { label: 'Queue',         icon: '≡',   route: '/queue'        },
    { label: 'Settings',      icon: '⚙',   route: '/settings'    }
  ];

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    const session = this.auth.getSession();
    if (session) {
      this.doctorName = session.name;
      this.doctorDept = session.dept;
    }
  }

  toggleStatus() {
    this.isOnline = !this.isOnline;
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}

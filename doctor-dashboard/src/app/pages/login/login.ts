import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  username = '';
  password = '';
  errorMsg = '';
  loading = false;

  demoAccounts = [
  { label: 'dr.smith — Cardio', username: 'dr.smith', password: '1234' },
  { label: 'dr.adams — Neuro', username: 'dr.adams', password: '1234' },
  { label: 'dr.lee — Ortho', username: 'dr.lee', password: '1234' },
  { label: 'dr.johnson — General', username: 'dr.johnson', password: '1234' },
  { label: 'nurse.cardio', username: 'nurse.cardio', password: '1234' },
  { label: 'nurse.neuro', username: 'nurse.neuro', password: '1234' },
  { label: 'nurse.ortho', username: 'nurse.ortho', password: '1234' }
];
  constructor(private auth: AuthService, private router: Router) {}

  fillDemo(acc: any) {
    this.username = acc.username;
    this.password = acc.password;
  }

  login() {
    if (!this.username || !this.password) {
      this.errorMsg = 'Please enter username and password';
      return;
    }
    this.loading = true;
    this.errorMsg = '';

    this.auth.login(this.username, this.password).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.auth.saveSession(res);
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMsg = res.message || 'Invalid credentials';
        }
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Cannot connect to server. Is Spring Boot running?';
      }
    });
  }
}
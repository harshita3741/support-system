import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {

  patientId = '';
  password = '';
  errorMsg = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  login() {
    if (!this.patientId || !this.password) {
      this.errorMsg = 'Please enter your Patient ID and password.';
      return;
    }
    this.errorMsg = '';
    this.loading = true;

    const payload = { patientId: this.patientId, password: this.password };

    this.http.post<any>('http://localhost:8080/patients/login', payload).subscribe({
      next: (res) => {
        this.loading = false;
        if (res && res.patientId) {
          localStorage.setItem('patientId', String(res.patientId));
          localStorage.setItem('patientName', res.fullName || res.email || this.patientId);
          this.auth.login({ email: res.fullName || res.email || this.patientId });
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMsg = 'Invalid Patient ID or password.';
        }
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 401 || err.status === 403 || err.status === 404) {
          this.errorMsg = 'Invalid Patient ID or password.';
        } else {
          // Fallback: allow access if backend is not running (dev mode)
          this.auth.login({ email: this.patientId });
          this.router.navigate(['/dashboard']);
        }
      }
    });
  }
}

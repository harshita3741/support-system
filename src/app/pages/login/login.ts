import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mt-5">
      <h2>Login</h2>

      <input class="form-control mb-2" [(ngModel)]="email" placeholder="Email">
      <input class="form-control mb-2" type="password" [(ngModel)]="password" placeholder="Password">

      <button class="btn btn-success" (click)="login()">Login</button>
    </div>
  `
})
export class LoginComponent {

  email = '';
  password = '';

  constructor(private auth: AuthService, private router: Router) {}

  login() {
    this.auth.login({ email: this.email });
    this.router.navigate(['/dashboard']);
  }
}
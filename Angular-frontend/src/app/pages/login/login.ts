import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../api';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  email = '';
  password = '';
  isAdminLogin = false;
  errorMessage = '';
  successMessage = '';

  constructor(private api: Api, private router: Router, private cdr: ChangeDetectorRef) {}

  onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter both email and password.';
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(this.email.trim())) {
      this.errorMessage = 'Please enter a valid email address (e.g. name@example.com).';
      return;
    }

    const credentials = { email: this.email, password: this.password };
    this.api.login(credentials).subscribe({
      next: (res: any) => {
        this.successMessage = 'Login successful!';
        this.cdr.detectChanges();

        // Redirect after a brief delay
        setTimeout(() => {
          if (res.user.role === 'admin') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/']);
          }
        }, 1000);
      },
      error: (err: any) => {
        this.errorMessage = err.error?.message || 'Login failed. Please check your credentials.';
        this.cdr.detectChanges();
      }
    });
  }
}

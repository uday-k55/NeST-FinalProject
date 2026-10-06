import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../api';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  errorMessage = '';
  successMessage = '';

  constructor(private api: Api, private router: Router, private cdr: ChangeDetectorRef) {}

  validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
  }

  validatePassword(password: string): string | null {
    if (password.length < 8 || password.length > 32) {
      return 'Password must be between 8 and 32 characters long.';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter (A-Z).';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter (a-z).';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number (0-9).';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return 'Password must contain at least one special character (!@#$%^&*...).';
    }
    return null;
  }

  onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.name.trim() || !/^[A-Za-z\s]{2,50}$/.test(this.name.trim())) {
      this.errorMessage = 'Please enter a valid Full Name containing only letters and spaces (2-50 characters).';
      return;
    }

    if (!this.email.trim() || !this.validateEmail(this.email)) {
      this.errorMessage = 'Please enter a valid email address (e.g. name@example.com).';
      return;
    }

    const pwdError = this.validatePassword(this.password);
    if (pwdError) {
      this.errorMessage = pwdError;
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    const newUser = {
      name: this.name.trim(),
      email: this.email.trim(),
      password: this.password
    };

    this.api.register(newUser).subscribe({
      next: () => {
        this.successMessage = 'Registration successful! Redirecting to login page...';
        this.cdr.detectChanges();

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      },
      error: (err: any) => {
        this.errorMessage = err.error?.message || 'Registration failed. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }
}

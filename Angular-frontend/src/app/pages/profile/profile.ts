import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../api';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile {
  user: any = null;
  orders: any[] = [];
  
  // Edit mode fields
  name = '';
  email = '';
  password = '';
  confirmPassword = '';

  isEditing = false;
  errorMessage = '';
  successMessage = '';
  loading = true;

  constructor(private api: Api, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    if (!this.api.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadProfile();
    this.loadOrderHistory();
  }

  loadProfile() {
    this.api.getProfile().subscribe({
      next: (res: any) => {
        this.user = res;
        this.name = res.name;
        this.email = res.email;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Could not load profile details.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadOrderHistory() {
    this.api.getOrders().subscribe({
      next: (res: any) => {
        this.orders = res;
        this.cdr.detectChanges();
      },
      error: () => {
        console.error('Could not load order history.');
      }
    });
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    this.errorMessage = '';
    this.successMessage = '';
  }

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

  onSave() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.name.trim() || !/^[A-Za-z\s]{2,50}$/.test(this.name.trim())) {
      this.errorMessage = 'Please enter a valid Name containing only letters and spaces (2-50 characters).';
      return;
    }

    if (!this.email.trim() || !this.validateEmail(this.email)) {
      this.errorMessage = 'Please enter a valid email address (e.g. name@example.com).';
      return;
    }

    if (this.password) {
      const pwdError = this.validatePassword(this.password);
      if (pwdError) {
        this.errorMessage = pwdError;
        return;
      }
      if (this.password !== this.confirmPassword) {
        this.errorMessage = 'Passwords do not match.';
        return;
      }
    }

    const updatedProfile: any = {
      name: this.name,
      email: this.email
    };

    if (this.password) {
      updatedProfile.password = this.password;
    }

    this.api.updateProfile(updatedProfile).subscribe({
      next: (res: any) => {
        this.successMessage = 'Profile updated successfully!';
        this.user = res.user;
        this.isEditing = false;
        this.password = '';
        this.confirmPassword = '';
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.errorMessage = err.error?.message || 'Failed to update profile.';
        this.cdr.detectChanges();
      }
    });
  }
}

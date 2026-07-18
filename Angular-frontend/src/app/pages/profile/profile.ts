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

  onSave() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.name || !this.email) {
      this.errorMessage = 'Name and email are required.';
      return;
    }

    if (this.password && this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
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

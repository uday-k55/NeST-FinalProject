import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../api';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.css'
})
export class Wishlist implements OnInit {
  items: any[] = [];
  loading = true;
  errorMessage = '';

  constructor(
    public api: Api,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (!this.api.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadWishlist();
  }

  loadWishlist() {
    this.loading = true;
    this.errorMessage = '';
    this.api.getWishlist().subscribe({
      next: (data: any) => {
        this.items = data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.errorMessage = err.error?.message || 'Failed to load wishlist items.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  removeFromWishlist(item: any) {
    this.api.removeFromWishlist(item.id).subscribe({
      next: () => {
        this.items = this.items.filter(i => i.id !== item.id);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        alert(err.error?.message || 'Failed to remove from wishlist.');
      }
    });
  }

  addToCart(item: any) {
    this.api.addToCart(item.id, 1).subscribe({
      next: () => {
        alert(`"${item.title || item.name}" added to cart successfully!`);
      },
      error: (err: any) => {
        alert(err.error?.message || 'Failed to add item to cart.');
      }
    });
  }
}

import { Component, Input } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Api } from '../../api';

@Component({
  selector: 'app-cards',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cards.html',
  styleUrl: './cards.css',
})
export class Cards {
  @Input() product: any;

  constructor(public api: Api, private router: Router) {}

  isInWishlist(): boolean {
    return this.api.isInWishlist(this.product.id);
  }

  toggleWishlist() {
    if (!this.api.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.api.toggleWishlist(this.product.id).subscribe({
      next: () => {},
      error: (err: any) => {
        alert(err.error?.message || 'Failed to update wishlist.');
      }
    });
  }

  onBuy() {
    if (!this.api.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.api.addToCart(this.product.id, 1).subscribe({
      next: () => {
        this.router.navigate(['/cart']);
      },
      error: (err: any) => {
        alert(err.error?.message || 'Failed to add item to cart.');
      }
    });
  }
}

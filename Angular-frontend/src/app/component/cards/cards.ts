import { Component, Input } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { Api } from '../../api';

@Component({
  selector: 'app-cards',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cards.html',
  styleUrl: './cards.css',
})
export class Cards {
  @Input() product: any;

  constructor(private api: Api, private router: Router) {}

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

import { ChangeDetectorRef, Component } from '@angular/core';
import { Api } from '../../api';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';

@Component({
  selector: 'app-view-product',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-product.html',
  styleUrl: './view-product.css',
})
export class ViewProduct {
  viewproduct: any;
  id: any;
  product: any;
  
  constructor(
    private api: Api,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private location: Location,
    private router: Router
  ) {}

  ngOnInit() {
    window.scrollTo(0, 0);
    this.id = this.route.snapshot.paramMap.get('id');
    this.api.getProductById(this.id).subscribe((res: any) => {
      this.product = res;
      this.cdr.detectChanges();
    });
  }

  goBack() {
    this.location.back();
  }

  addToCart() {
    if (!this.api.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.api.addToCart(this.product.id, 1).subscribe({
      next: () => {
        alert(`${this.product.title} added to cart successfully.`);
      },
      error: (err: any) => {
        alert(err.error?.message || 'Failed to add item to cart.');
      }
    });
  }

  buyNow() {
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

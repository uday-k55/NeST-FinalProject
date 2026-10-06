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
  selectedImageIndex = 0;
  
  constructor(
    public api: Api,
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
      this.selectedImageIndex = 0;
      this.cdr.detectChanges();
    });
  }

  selectImage(index: number) {
    this.selectedImageIndex = index;
    this.cdr.detectChanges();
  }

  prevImage() {
    if (this.product?.images?.length) {
      this.selectedImageIndex = (this.selectedImageIndex - 1 + this.product.images.length) % this.product.images.length;
      this.cdr.detectChanges();
    }
  }

  nextImage() {
    if (this.product?.images?.length) {
      this.selectedImageIndex = (this.selectedImageIndex + 1) % this.product.images.length;
      this.cdr.detectChanges();
    }
  }

  isInWishlist(): boolean {
    return this.api.isInWishlist(this.product?.id);
  }

  toggleWishlist() {
    if (!this.api.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.api.toggleWishlist(this.product.id).subscribe({
      next: () => {
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        alert(err.error?.message || 'Failed to update wishlist.');
      }
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

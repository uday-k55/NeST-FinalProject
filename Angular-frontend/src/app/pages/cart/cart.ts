import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../api';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cart.html',
  styleUrl: './cart.css'
})
export class Cart {
  cartItems: any[] = [];
  subtotal = 0;
  discount = 0;
  total = 0;
  address = '';
  errorMessage = '';
  loading = true;

  constructor(private api: Api, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    if (!this.api.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadCart();
  }

  loadCart() {
    this.loading = true;
    this.api.getCart().subscribe({
      next: (res: any) => {
        this.cartItems = res;
        this.calculateTotals();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to load cart items.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  calculateTotals() {
    this.subtotal = this.cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    // Give a 10% discount on order
    this.discount = parseFloat((this.subtotal * 0.1).toFixed(2));
    this.total = parseFloat((this.subtotal - this.discount).toFixed(2));
  }

  updateQuantity(item: any, amount: number) {
    const newQty = item.quantity + amount;
    if (newQty < 1) return;
    if (newQty > item.product.stock) {
      alert(`Only ${item.product.stock} items left in stock.`);
      return;
    }

    this.api.updateCartQty(item.id, newQty).subscribe({
      next: () => {
        item.quantity = newQty;
        this.calculateTotals();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        alert(err.error?.message || 'Failed to update quantity.');
      }
    });
  }

  removeItem(item: any) {
    if (confirm(`Remove ${item.product.title} from cart?`)) {
      this.api.removeFromCart(item.id).subscribe({
        next: () => {
          this.cartItems = this.cartItems.filter(ci => ci.id !== item.id);
          this.calculateTotals();
          this.cdr.detectChanges();
        },
        error: () => {
          alert('Failed to remove item.');
        }
      });
    }
  }

  onCheckout() {
    this.errorMessage = '';

    if (!this.address.trim()) {
      this.errorMessage = 'Please enter a shipping address to checkout.';
      return;
    }

    // Call checkout endpoint in backend to create the order
    this.api.createOrder(this.address).subscribe({
      next: (res: any) => {
        // Save order details to process payment
        localStorage.setItem('checkout_order_id', res.orderId.toString());
        localStorage.setItem('checkout_total_amount', res.totalAmount.toString());
        
        // Navigate to payment gateway
        this.router.navigate(['/payment']);
      },
      error: (err: any) => {
        this.errorMessage = err.error?.message || 'Checkout failed. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }
}

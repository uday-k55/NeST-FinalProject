import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Api } from '../../api';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment.html',
  styleUrl: './payment.css'
})
export class Payment {
  orderId = 0;
  baseAmount = 0;
  totalAmount = 0;
  codCharge = 0;

  // Selected Option: 'upi' | 'card' | 'wallet' | 'cod'
  paymentMethod = 'upi';

  // UPI Fields
  upiId = '';

  // Card Fields
  cardHolderName = '';
  cardNumber = '';
  expiryDate = '';
  cvv = '';

  // Wallet Fields
  walletBalance = 75000.00;

  // Processing state variables
  isProcessing = false;
  isSuccess = false;
  isFailed = false;
  transactionId = '';
  errorMessage = '';

  constructor(
    private api: Api,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (!this.api.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    const oId = localStorage.getItem('checkout_order_id');
    const amt = localStorage.getItem('checkout_total_amount');

    if (!oId || !amt) {
      alert('No checkout active. Redirecting to home.');
      this.router.navigate(['/']);
      return;
    }

    this.orderId = parseInt(oId, 10);
    this.baseAmount = parseFloat(amt);
    this.updateTotals();
  }

  setPaymentMethod(method: string) {
    this.paymentMethod = method;
    this.errorMessage = '';
    this.isFailed = false;
    this.updateTotals();
    this.cdr.detectChanges();
  }

  chooseAnotherMethod() {
    this.isFailed = false;
    this.errorMessage = '';
    // Switch away from wallet to UPI so user can select another method
    this.setPaymentMethod('upi');
  }

  updateTotals() {
    if (this.paymentMethod === 'cod') {
      this.codCharge = 8.00;
      this.totalAmount = parseFloat((this.baseAmount + 8.00).toFixed(2));
    } else {
      this.codCharge = 0;
      this.totalAmount = this.baseAmount;
    }
  }

  validateUPI(): boolean {
    const upiPattern = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (!this.upiId || !upiPattern.test(this.upiId.trim())) {
      this.errorMessage = 'Please enter a valid UPI ID (e.g. user@okaxis, name@paytm).';
      return false;
    }
    return true;
  }

  validateCard(): boolean {
    if (!this.cardHolderName.trim() || !/^[A-Za-z\s]{2,50}$/.test(this.cardHolderName.trim())) {
      this.errorMessage = 'Please enter a valid Card Holder Name (letters and spaces only).';
      return false;
    }

    const cardNumClean = this.cardNumber.replace(/\s+/g, '');
    if (!cardNumClean || cardNumClean.length < 15 || cardNumClean.length > 16 || isNaN(Number(cardNumClean))) {
      this.errorMessage = 'Please enter a valid 15 or 16-digit Card Number.';
      return false;
    }

    const expiryPattern = /^(0[1-9]|1[0-2])\/?([0-9]{2})$/;
    if (!this.expiryDate || !expiryPattern.test(this.expiryDate.trim())) {
      this.errorMessage = 'Please enter a valid expiry date in MM/YY format.';
      return false;
    }

    if (!this.cvv || this.cvv.trim().length !== 3 || isNaN(Number(this.cvv))) {
      this.errorMessage = 'Please enter a valid 3-digit CVV security code.';
      return false;
    }

    return true;
  }

  processPayment() {
    this.errorMessage = '';
    this.isProcessing = false;
    this.isSuccess = false;
    this.isFailed = false;

    // Validate per method
    if (this.paymentMethod === 'upi') {
      if (!this.validateUPI()) return;
    } else if (this.paymentMethod === 'card') {
      if (!this.validateCard()) return;
    }

    // 1. Show processing state
    this.isProcessing = true;
    this.cdr.detectChanges();

    // Generate Transaction ID: e.g. MBLPAY000001
    const randNum = Math.floor(100000 + Math.random() * 900000);
    this.transactionId = `MBLPAY${randNum}`;

    // Simulate standard payment gateway processing delay (1.5s)
    setTimeout(() => {
      let methodLabel = 'Credit/Debit Card';
      if (this.paymentMethod === 'upi') methodLabel = 'UPI';
      if (this.paymentMethod === 'wallet') methodLabel = 'Wallet';
      if (this.paymentMethod === 'cod') methodLabel = 'Cash on Delivery';

      const paymentPayload: any = {
        order_id: this.orderId,
        payment_method: methodLabel,
        transaction_id: this.transactionId
      };

      // Wallet MUST ALWAYS fail
      if (this.paymentMethod === 'wallet') {
        paymentPayload.status = 'FAILED';
      }

      this.api.createPayment(paymentPayload).subscribe({
        next: (res: any) => {
          this.isProcessing = false;
          this.isSuccess = true;

          // Remove purchased products from user's wishlist in frontend
          if (res && res.removedWishlistProductIds && res.removedWishlistProductIds.length > 0) {
            this.api.removeProductsFromWishlist(res.removedWishlistProductIds);
          } else {
            this.api.syncWishlist();
          }

          this.cdr.detectChanges();

          // Redirect after 2 seconds to success page
          setTimeout(() => {
            // Remove checkout tokens
            localStorage.removeItem('checkout_order_id');
            localStorage.removeItem('checkout_total_amount');
            localStorage.removeItem('checkout_subtotal');
            localStorage.removeItem('checkout_address');
            
            // Navigate to Order Success Page
            this.router.navigate(['/order-success'], {
              queryParams: {
                orderId: this.orderId,
                transactionId: this.transactionId
              }
            });
          }, 2000);
        },
        error: (err: any) => {
          this.isProcessing = false;
          this.isFailed = true;
          this.errorMessage = err.error?.message || 'Payment failed. Please try again or choose another payment method.';
          this.cdr.detectChanges();
        }
      });

    }, 1500);
  }

  retryPayment() {
    this.isFailed = false;
    this.errorMessage = '';
    // Retry attempts payment with current method (if Wallet, it still fails)
    this.processPayment();
  }
}

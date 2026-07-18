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
  totalAmount = 0;

  // Selected Option: 'upi' or 'card'
  paymentMethod = 'upi';

  // UPI Fields
  upiId = '';

  // Card Fields
  cardHolderName = '';
  cardNumber = '';
  expiryDate = '';
  cvv = '';

  // Processing state variables
  isProcessing = false;
  isSuccess = false;
  transactionId = '';
  errorMessage = '';

  constructor(private api: Api, private router: Router, private cdr: ChangeDetectorRef) {}

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

    this.orderId = parseInt(oId);
    this.totalAmount = parseFloat(amt);
  }

  validateUPI(): boolean {
    const upiPattern = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (!this.upiId || !upiPattern.test(this.upiId)) {
      this.errorMessage = 'Please enter a valid UPI ID (e.g. user@okaxis).';
      return false;
    }
    return true;
  }

  validateCard(): boolean {
    if (!this.cardHolderName.trim()) {
      this.errorMessage = 'Please enter the Card Holder Name.';
      return false;
    }

    const cardNumClean = this.cardNumber.replace(/\s+/g, '');
    if (!cardNumClean || cardNumClean.length < 15 || cardNumClean.length > 16 || isNaN(Number(cardNumClean))) {
      this.errorMessage = 'Please enter a valid 15 or 16-digit Card Number.';
      return false;
    }

    const expiryPattern = /^(0[1-9]|1[0-2])\/?([0-9]{2})$/;
    if (!this.expiryDate || !expiryPattern.test(this.expiryDate)) {
      this.errorMessage = 'Please enter a valid expiry date (MM/YY).';
      return false;
    }

    if (!this.cvv || this.cvv.length !== 3 || isNaN(Number(this.cvv))) {
      this.errorMessage = 'Please enter a valid 3-digit CVV.';
      return false;
    }

    return true;
  }

  processPayment() {
    this.errorMessage = '';
    this.isProcessing = false;
    this.isSuccess = false;

    if (this.paymentMethod === 'upi') {
      if (!this.validateUPI()) return;
    } else {
      if (!this.validateCard()) return;
    }

    // 1. Show processing state
    this.isProcessing = true;
    this.cdr.detectChanges();

    // Generate Transaction ID: e.g. MBLPAY000001
    const randNum = Math.floor(100000 + Math.random() * 900000);
    this.transactionId = `MBLPAY${randNum}`;

    // 2. Wait 2.5 seconds to show "Processing Payment..."
    setTimeout(() => {
      // 3. Make API call to post payment in backend
      const paymentPayload = {
        order_id: this.orderId,
        payment_method: this.paymentMethod === 'upi' ? 'UPI' : 'Credit/Debit Card',
        transaction_id: this.transactionId
      };

      this.api.createPayment(paymentPayload).subscribe({
        next: () => {
          this.isProcessing = false;
          this.isSuccess = true;
          this.cdr.detectChanges();

          // 4. Redirect after 2 seconds to success page
          setTimeout(() => {
            // Remove checkout tokens
            localStorage.removeItem('checkout_order_id');
            localStorage.removeItem('checkout_total_amount');
            
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
          this.errorMessage = err.error?.message || 'Payment execution failed on backend. Please try again.';
          this.cdr.detectChanges();
        }
      });

    }, 2500);
  }
}

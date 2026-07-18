import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../../api';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-success.html',
  styleUrl: './order-success.css'
})
export class OrderSuccess {
  orderId = '';
  transactionId = '';
  estimatedDelivery = new Date();

  constructor(private route: ActivatedRoute, private api: Api, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.orderId = params['orderId'] || 'N/A';
      this.transactionId = params['transactionId'] || 'N/A';

      // Set delivery date to 4 days from now
      const delivery = new Date();
      delivery.setDate(delivery.getDate() + 4);
      this.estimatedDelivery = delivery;

      this.api.syncCartCount();
      this.cdr.detectChanges();
    });
  }
}

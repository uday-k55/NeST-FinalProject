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
  
  // Delivery Address Options: 'location' or 'manual'
  addressMode: 'location' | 'manual' = 'manual';
  
  // Manual address fields
  manualAddress = {
    fullName: '',
    house: '',
    street: '',
    city: '',
    district: '',
    state: '',
    pinCode: '',
    phone: ''
  };

  // Location fields
  locationAddress = '';
  locationPhone = '';
  isLocating = false;
  locationStatus = '';

  address = '';
  errorMessage = '';
  loading = true;

  constructor(private api: Api, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    if (!this.api.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    const user = this.api.currentUser();
    if (user && user.name) {
      this.manualAddress.fullName = user.name;
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

  // --- Location Option ---
  fetchCurrentLocation() {
    if (!navigator.geolocation) {
      this.locationStatus = 'Geolocation is not supported by your browser. Please enter address manually.';
      return;
    }

    this.isLocating = true;
    this.locationStatus = 'Requesting browser location permission...';
    this.cdr.detectChanges();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        this.locationStatus = 'Coordinates obtained. Resolving address details...';
        this.cdr.detectChanges();

        // Reverse geocoding via OpenStreetMap API
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`)
          .then(res => res.json())
          .then(data => {
            this.isLocating = false;
            if (data && data.display_name) {
              this.locationAddress = data.display_name;
              this.locationStatus = 'Location detected successfully!';
              
              // Also prefill manual fields if user wants to switch/tweak
              if (data.address) {
                this.manualAddress.city = data.address.city || data.address.town || data.address.village || '';
                this.manualAddress.district = data.address.state_district || data.address.county || '';
                this.manualAddress.state = data.address.state || '';
                this.manualAddress.pinCode = data.address.postcode || '';
                this.manualAddress.street = data.address.road || data.address.suburb || '';
              }
            } else {
              this.locationAddress = `Location Coordinates: Lat ${lat.toFixed(5)}, Lon ${lon.toFixed(5)}`;
              this.locationStatus = 'Location coordinates detected.';
            }
            this.cdr.detectChanges();
          })
          .catch(() => {
            this.isLocating = false;
            this.locationAddress = `Location: Latitude ${lat.toFixed(5)}, Longitude ${lon.toFixed(5)}`;
            this.locationStatus = 'Coordinates obtained (network lookup unavailable).';
            this.cdr.detectChanges();
          });
      },
      (error) => {
        this.isLocating = false;
        if (error.code === error.PERMISSION_DENIED) {
          this.locationStatus = 'Location permission denied. You can enter your delivery address manually below.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          this.locationStatus = 'Location information is unavailable. Please enter your address manually.';
        } else if (error.code === error.TIMEOUT) {
          this.locationStatus = 'Location request timed out. Please enter your address manually.';
        } else {
          this.locationStatus = 'Unable to retrieve location. Please enter your address manually.';
        }
        this.cdr.detectChanges();
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  // --- Validate and Build Address ---
  validateAndBuildAddress(): string | null {
    if (this.addressMode === 'location') {
      if (!this.locationAddress.trim()) {
        this.errorMessage = 'Please click "Detect My Location" or switch to "Enter Address Manually".';
        return null;
      }
      const phoneClean = this.locationPhone.trim();
      if (!phoneClean || !/^\d{10}$/.test(phoneClean)) {
        this.errorMessage = 'Please enter a valid 10-digit contact phone number for delivery.';
        return null;
      }
      return `${this.locationAddress} (Contact: ${phoneClean})`;
    } else {
      const { fullName, house, street, city, district, state, pinCode, phone } = this.manualAddress;

      // Name validation: alphabetic and spaces only, no numbers or special symbols
      if (!fullName.trim() || !/^[A-Za-z\s]{2,50}$/.test(fullName.trim())) {
        this.errorMessage = 'Please enter a valid Full Name (letters and spaces only).';
        return null;
      }

      if (!house.trim()) {
        this.errorMessage = 'Please enter House / Building / Flat details.';
        return null;
      }

      if (!street.trim()) {
        this.errorMessage = 'Please enter Street / Locality details.';
        return null;
      }

      if (!city.trim() || !/^[A-Za-z\s]{2,50}$/.test(city.trim())) {
        this.errorMessage = 'Please enter a valid City name.';
        return null;
      }

      if (!district.trim()) {
        this.errorMessage = 'Please enter District.';
        return null;
      }

      if (!state.trim()) {
        this.errorMessage = 'Please enter State.';
        return null;
      }

      if (!pinCode.trim() || !/^\d{6}$/.test(pinCode.trim())) {
        this.errorMessage = 'Please enter a valid 6-digit PIN Code.';
        return null;
      }

      if (!phone.trim() || !/^\d{10}$/.test(phone.trim())) {
        this.errorMessage = 'Please enter a valid 10-digit Phone Number (numbers only).';
        return null;
      }

      return `${fullName.trim()}, ${house.trim()}, ${street.trim()}, ${city.trim()}, ${district.trim()}, ${state.trim()} - PIN: ${pinCode.trim()}, Phone: ${phone.trim()}`;
    }
  }

  onCheckout() {
    this.errorMessage = '';

    const formattedAddress = this.validateAndBuildAddress();
    if (!formattedAddress) {
      return;
    }

    // Call checkout endpoint in backend to create the order
    this.api.createOrder(formattedAddress).subscribe({
      next: (res: any) => {
        // Save order details to process payment
        localStorage.setItem('checkout_order_id', res.orderId.toString());
        localStorage.setItem('checkout_total_amount', res.totalAmount.toString());
        localStorage.setItem('checkout_subtotal', (res.subtotal || this.total).toString());
        localStorage.setItem('checkout_address', formattedAddress);
        
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

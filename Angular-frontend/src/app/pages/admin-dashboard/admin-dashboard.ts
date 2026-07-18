import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Api } from '../../api';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard {
  // Stats
  stats: any = {
    totalProducts: 0,
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0.00,
    categories: [],
    latestOrders: []
  };

  // Listings
  products: any[] = [];
  users: any[] = [];
  orders: any[] = [];

  // Active Tab: 'dashboard' | 'products' | 'users' | 'orders'
  activeTab = 'dashboard';

  // Product Form state
  productForm = {
    name: '',
    description: '',
    price: 0,
    category: 'smartphones',
    stock: 0,
    image: null as File | null
  };
  isEditingProduct = false;
  selectedProductId: number | null = null;
  productSuccessMessage = '';
  productErrorMessage = '';

  // Order update state
  selectedOrder: any = null;
  newOrderStatus = 'Pending';
  orderSuccessMessage = '';

  loading = true;

  constructor(private api: Api, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    if (!this.api.isLoggedIn() || !this.api.isAdmin()) {
      alert('Access Denied. Admins only.');
      this.router.navigate(['/login']);
      return;
    }

    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loading = true;
    this.api.getStats().subscribe({
      next: (res: any) => {
        this.stats = res;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        alert('Failed to load dashboard statistics.');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  switchTab(tab: string) {
    this.activeTab = tab;
    this.productSuccessMessage = '';
    this.productErrorMessage = '';
    this.orderSuccessMessage = '';

    if (tab === 'dashboard') {
      this.loadDashboardData();
    } else if (tab === 'products') {
      this.loadProductsList();
    } else if (tab === 'users') {
      this.loadUsersList();
    } else if (tab === 'orders') {
      this.loadOrdersList();
    }
  }

  // --- Products Tab ---
  loadProductsList() {
    this.api.getMobiles().subscribe({
      next: (mobilesRes: any) => {
        this.api.getLaptops().subscribe({
          next: (laptopsRes: any) => {
            const mobiles = mobilesRes.products || [];
            const laptops = laptopsRes.products || [];
            this.products = [...mobiles, ...laptops];
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.productForm.image = file;
    }
  }

  resetProductForm() {
    this.productForm = {
      name: '',
      description: '',
      price: 0,
      category: 'smartphones',
      stock: 0,
      image: null
    };
    this.isEditingProduct = false;
    this.selectedProductId = null;
  }

  editProduct(product: any) {
    this.isEditingProduct = true;
    this.selectedProductId = product.id;
    this.productForm = {
      name: product.name || product.title,
      description: product.description,
      price: product.price,
      category: product.category,
      stock: product.stock,
      image: null // Let user select a new one or keep existing
    };
    this.cdr.detectChanges();
  }

  onSubmitProduct() {
    this.productSuccessMessage = '';
    this.productErrorMessage = '';

    const formData = new FormData();
    formData.append('name', this.productForm.name);
    formData.append('description', this.productForm.description);
    formData.append('price', this.productForm.price.toString());
    formData.append('category', this.productForm.category);
    formData.append('stock', this.productForm.stock.toString());
    if (this.productForm.image) {
      formData.append('image', this.productForm.image);
    }

    if (this.isEditingProduct && this.selectedProductId !== null) {
      this.api.updateProduct(this.selectedProductId, formData).subscribe({
        next: () => {
          this.productSuccessMessage = 'Product updated successfully!';
          this.loadProductsList();
          this.resetProductForm();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.productErrorMessage = err.error?.message || 'Failed to update product.';
          this.cdr.detectChanges();
        }
      });
    } else {
      this.api.createProduct(formData).subscribe({
        next: () => {
          this.productSuccessMessage = 'Product added successfully!';
          this.loadProductsList();
          this.resetProductForm();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.productErrorMessage = err.error?.message || 'Failed to create product.';
          this.cdr.detectChanges();
        }
      });
    }
  }

  deleteProduct(product: any) {
    if (confirm(`Are you sure you want to delete "${product.title || product.name}"?`)) {
      this.api.deleteProduct(product.id).subscribe({
        next: () => {
          alert('Product deleted successfully.');
          this.loadProductsList();
        },
        error: () => {
          alert('Failed to delete product.');
        }
      });
    }
  }

  // --- Users Tab ---
  loadUsersList() {
    this.api.getUsers().subscribe({
      next: (res: any) => {
        this.users = res;
        this.cdr.detectChanges();
      }
    });
  }

  // --- Orders Tab ---
  loadOrdersList() {
    this.api.getOrders().subscribe({
      next: (res: any) => {
        this.orders = res;
        this.cdr.detectChanges();
      }
    });
  }

  selectOrderForUpdate(order: any) {
    this.selectedOrder = order;
    this.newOrderStatus = order.order_status;
    this.orderSuccessMessage = '';
    this.cdr.detectChanges();
  }

  updateOrderStatus() {
    if (!this.selectedOrder) return;
    this.api.updateOrderStatus(this.selectedOrder.id, this.newOrderStatus).subscribe({
      next: () => {
        this.orderSuccessMessage = 'Order status updated successfully!';
        this.selectedOrder.order_status = this.newOrderStatus;
        this.loadOrdersList();
        this.cdr.detectChanges();
        setTimeout(() => {
          this.selectedOrder = null;
          this.cdr.detectChanges();
        }, 1500);
      },
      error: () => {
        alert('Failed to update order status.');
      }
    });
  }
}

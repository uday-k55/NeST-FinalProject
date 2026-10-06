import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class Api {
  private baseUrl = 'http://localhost:5000/api';

  // Signals to track state across components
  currentUser = signal<any>(null);
  cartItemCount = signal<number>(0);
  wishlistProductIds = signal<number[]>([]);
  wishlistCount = signal<number>(0);

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  // --- Auth Helpers ---
  private loadUserFromStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (userStr && token) {
        try {
          this.currentUser.set(JSON.parse(userStr));
          this.syncCartCount();
          this.syncWishlist();
        } catch (e) {
          this.logout();
        }
      }
    }
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  isAdmin(): boolean {
    const user = this.currentUser();
    return user && user.role === 'admin';
  }

  getToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('token');
    }
    return null;
  }

  getHeaders() {
    const token = this.getToken();
    return {
      headers: {
        Authorization: token ? `Bearer ${token}` : ''
      }
    };
  }

  logout() {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    this.currentUser.set(null);
    this.cartItemCount.set(0);
    this.wishlistProductIds.set([]);
    this.wishlistCount.set(0);
  }

  // --- Auth API ---
  register(user: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/register`, user);
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login`, credentials).pipe(
      tap((res: any) => {
        if (res && res.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
          this.currentUser.set(res.user);
          this.syncCartCount();
          this.syncWishlist();
        }
      })
    );
  }

  getProfile(): Observable<any> {
    return this.http.get(`${this.baseUrl}/auth/profile`, this.getHeaders());
  }

  updateProfile(profileData: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/auth/profile`, profileData, this.getHeaders()).pipe(
      tap((res: any) => {
        if (res && res.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
          this.currentUser.set(res.user);
        }
      })
    );
  }

  // --- Products API ---
  getMobiles(search?: string, sort?: string, order?: string): Observable<any> {
    let params = new HttpParams().set('category', 'smartphones');
    if (search) params = params.set('search', search);
    if (sort) params = params.set('sort', sort);
    if (order) params = params.set('order', order);
    return this.http.get(`${this.baseUrl}/products`, { params });
  }

  getLaptops(search?: string, sort?: string, order?: string): Observable<any> {
    let params = new HttpParams().set('category', 'laptops');
    if (search) params = params.set('search', search);
    if (sort) params = params.set('sort', sort);
    if (order) params = params.set('order', order);
    return this.http.get(`${this.baseUrl}/products`, { params });
  }

  getProductById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/products/${id}`);
  }

  // --- Cart API ---
  getCart(): Observable<any> {
    return this.http.get(`${this.baseUrl}/cart`, this.getHeaders()).pipe(
      tap((res: any) => {
        if (Array.isArray(res)) {
          const totalQty = res.reduce((acc, item) => acc + (item.quantity || 0), 0);
          this.cartItemCount.set(totalQty);
        }
      })
    );
  }

  addToCart(productId: number, quantity: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/cart`, { product_id: productId, quantity }, this.getHeaders()).pipe(
      tap(() => this.syncCartCount())
    );
  }

  updateCartQty(cartId: number, quantity: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/cart/${cartId}`, { quantity }, this.getHeaders()).pipe(
      tap(() => this.syncCartCount())
    );
  }

  removeFromCart(cartId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/cart/${cartId}`, this.getHeaders()).pipe(
      tap(() => this.syncCartCount())
    );
  }

  syncCartCount() {
    if (this.isLoggedIn()) {
      this.getCart().subscribe({
        next: () => {},
        error: () => {}
      });
    }
  }

  // --- Wishlist API ---
  getWishlist(): Observable<any> {
    return this.http.get(`${this.baseUrl}/wishlist`, this.getHeaders()).pipe(
      tap((items: any) => {
        if (Array.isArray(items)) {
          this.wishlistCount.set(items.length);
          this.wishlistProductIds.set(items.map((it: any) => it.id));
        }
      })
    );
  }

  getWishlistIds(): Observable<number[]> {
    return this.http.get<number[]>(`${this.baseUrl}/wishlist/ids`, this.getHeaders()).pipe(
      tap((ids: number[]) => {
        if (Array.isArray(ids)) {
          this.wishlistProductIds.set(ids);
          this.wishlistCount.set(ids.length);
        }
      })
    );
  }

  toggleWishlist(productId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/wishlist/toggle`, { product_id: productId }, this.getHeaders()).pipe(
      tap((res: any) => {
        const currentIds = this.wishlistProductIds();
        if (res.inWishlist) {
          if (!currentIds.includes(productId)) {
            const updated = [...currentIds, productId];
            this.wishlistProductIds.set(updated);
            this.wishlistCount.set(updated.length);
          }
        } else {
          const updated = currentIds.filter(id => id !== productId);
          this.wishlistProductIds.set(updated);
          this.wishlistCount.set(updated.length);
        }
      })
    );
  }

  addToWishlist(productId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/wishlist`, { product_id: productId }, this.getHeaders()).pipe(
      tap(() => this.syncWishlist())
    );
  }

  removeFromWishlist(productId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/wishlist/${productId}`, this.getHeaders()).pipe(
      tap(() => {
        const updated = this.wishlistProductIds().filter(id => id !== productId);
        this.wishlistProductIds.set(updated);
        this.wishlistCount.set(updated.length);
      })
    );
  }

  isInWishlist(productId: number): boolean {
    return this.wishlistProductIds().includes(productId);
  }

  removeProductsFromWishlist(productIds: number[]) {
    if (!productIds || productIds.length === 0) return;
    const numIds = productIds.map(id => Number(id));
    const current = this.wishlistProductIds();
    const updated = current.filter(id => !numIds.includes(id));
    this.wishlistProductIds.set(updated);
    this.wishlistCount.set(updated.length);
    this.syncWishlist();
  }

  syncWishlist() {
    if (this.isLoggedIn()) {
      this.getWishlistIds().subscribe({
        next: () => {},
        error: () => {}
      });
    }
  }

  // --- Orders API ---
  createOrder(orderData: any): Observable<any> {
    const payload = typeof orderData === 'string' ? { address: orderData } : orderData;
    return this.http.post(`${this.baseUrl}/orders`, payload, this.getHeaders());
  }

  getOrders(): Observable<any> {
    return this.http.get(`${this.baseUrl}/orders`, this.getHeaders());
  }

  getOrderById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/orders/${id}`, this.getHeaders());
  }

  updateOrderStatus(orderId: number, status: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/orders/${orderId}/status`, { order_status: status }, this.getHeaders());
  }

  // --- Payment API ---
  createPayment(paymentData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/payment`, paymentData, this.getHeaders());
  }

  getPaymentById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/payment/${id}`, this.getHeaders());
  }

  // --- Admin API ---
  getStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/stats`, this.getHeaders());
  }

  getUsers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/users`, this.getHeaders());
  }

  createProduct(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/products`, formData, this.getHeaders());
  }

  updateProduct(id: number, formData: FormData): Observable<any> {
    return this.http.put(`${this.baseUrl}/products/${id}`, formData, this.getHeaders());
  }

  deleteProduct(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/products/${id}`, this.getHeaders());
  }
}

import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Contact } from './pages/contact/contact';
import { About } from './pages/about/about';
import { Mobile } from './pages/mobile/mobile';
import { Laptop } from './pages/laptop/laptop';
import { ViewProduct } from './pages/view-product/view-product';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Profile } from './pages/profile/profile';
import { Cart } from './pages/cart/cart';
import { Payment } from './pages/payment/payment';
import { OrderSuccess } from './pages/order-success/order-success';
import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';
import { Wishlist } from './pages/wishlist/wishlist';

export const routes: Routes = [
    {path: '',component:Home},
    {path: 'mobiles',component:Mobile},
    {path: 'laptops',component:Laptop},
    {path: 'about',component:About},
    {path: 'contact',component:Contact},
    {path: 'view-product/:id',component:ViewProduct},
    {path: 'login',component:Login},
    {path: 'register',component:Register},
    {path: 'profile',component:Profile},
    {path: 'cart',component:Cart},
    {path: 'wishlist',component:Wishlist},
    {path: 'payment',component:Payment},
    {path: 'order-success',component:OrderSuccess},
    {path: 'admin',component:AdminDashboard}
];

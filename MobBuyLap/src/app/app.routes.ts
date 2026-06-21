import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Contact } from './pages/contact/contact';
import { About } from './pages/about/about';
import { Mobile } from './pages/mobile/mobile';
import { Laptop } from './pages/laptop/laptop';
import { ViewProduct } from './pages/view-product/view-product';

export const routes: Routes = [
    {path: '',component:Home},
    {path: 'mobiles',component:Mobile},
    {path: 'laptops',component:Laptop},
    {path: 'about',component:About},
    {path: 'contact',component:Contact},
    {path: 'view-product/:id',component:ViewProduct}
];

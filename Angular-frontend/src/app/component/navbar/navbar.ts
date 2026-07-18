import { Component } from '@angular/core';
import { RouterLink, RouterModule, Router } from "@angular/router";
import { CommonModule } from '@angular/common';
import { Api } from '../../api';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterModule, CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  constructor(public api: Api, private router: Router) {}

  onLogout() {
    this.api.logout();
    this.router.navigate(['/']);
  }

  onSearchSubmit(event: Event, searchInput: HTMLInputElement) {
    event.preventDefault();
    const query = searchInput.value.trim();
    
    // Determine whether to search mobiles or laptops based on URL
    const currentUrl = this.router.url;
    const targetRoute = currentUrl.includes('laptops') ? '/laptops' : '/mobiles';
    
    this.router.navigate([targetRoute], { queryParams: { search: query }, queryParamsHandling: 'merge' });
  }
}

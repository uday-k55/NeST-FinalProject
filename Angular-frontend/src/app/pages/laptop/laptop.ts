import { Component, ChangeDetectorRef } from '@angular/core';
import { Cards } from "../../component/cards/cards";
import { Api } from '../../api';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-laptop',
  standalone: true,
  imports: [Cards, CommonModule],
  templateUrl: './laptop.html',
  styleUrl: './laptop.css',
})
export class Laptop {
  data: any[] = [];
  searchQuery = '';
  sortOption = '';

  constructor(
    private api: Api, 
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.searchQuery = params['search'] || '';
      this.sortOption = params['sort'] || '';
      this.loadProducts();
    });
  }

  loadProducts() {
    let sort = '';
    let order = '';
    if (this.sortOption === 'price_asc') {
      sort = 'price';
      order = 'asc';
    } else if (this.sortOption === 'price_desc') {
      sort = 'price';
      order = 'desc';
    }

    this.api.getLaptops(this.searchQuery, sort, order).subscribe((res: any) => {
      this.data = res.products || [];
      this.cdr.detectChanges();
    });
  }

  onSortChange(event: any) {
    const value = event.target.value;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sort: value || null },
      queryParamsHandling: 'merge'
    });
  }
}

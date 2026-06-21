import { ChangeDetectorRef, Component } from '@angular/core';
import { Api } from '../../api';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, Location } from '@angular/common';

@Component({
  selector: 'app-view-product',
  imports: [CommonModule],
  templateUrl: './view-product.html',
  styleUrl: './view-product.css',
})
export class ViewProduct {
  viewproduct:any;
  id:any;
  product: any;
  constructor(private api: Api,private cdr: ChangeDetectorRef,private route: ActivatedRoute,private location: Location) {}
  ngOnInit(){
     window.scrollTo(0, 0);
    this.id = this.route.snapshot.paramMap.get('id');
    this.api.getProductById(this.id).subscribe((res: any) => {
      this.product=res;
      this.cdr.detectChanges();
    })
  }
  goBack() {
  this.location.back();
}
}

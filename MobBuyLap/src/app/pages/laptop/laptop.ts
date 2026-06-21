import { ChangeDetectorRef, Component } from '@angular/core';
import { Api } from '../../api';
import { Cards } from "../../component/cards/cards";

@Component({
  selector: 'app-laptop',
  imports: [Cards],
  templateUrl: './laptop.html',
  styleUrl: './laptop.css',
})
export class Laptop {
  data: any[] = [];
  constructor(private api:Api, private cdr: ChangeDetectorRef) {}
  ngOnInit(){
    this.api.getLaptops().subscribe((res: any) => {
      this.data=res.products;
      this.cdr.detectChanges();
    })
}
}

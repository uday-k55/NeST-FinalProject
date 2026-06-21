import { Component, ChangeDetectorRef } from '@angular/core';
import { Cards } from "../../component/cards/cards";
import { Api } from '../../api';


@Component({
  selector: 'app-mobile',
  imports: [Cards],
  templateUrl: './mobile.html',
  styleUrl: './mobile.css',
})
export class Mobile {
  data: any[] = [];
  constructor(private api: Api, private cdr: ChangeDetectorRef) {}
  ngOnInit(){
    this.api.getMobiles().subscribe((res: any) => {
      this.data=res.products;
      this.cdr.detectChanges();
    })
}
}

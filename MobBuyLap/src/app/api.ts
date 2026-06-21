import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Api {
  constructor(private http: HttpClient) {}
  getMobiles(){
    return this.http.get("https://dummyjson.com/products/category/smartphones")
  }
  getProductById(id: string){
    return this.http.get(`https://dummyjson.com/products/${id}`)
  }
  getLaptops(){
    return this.http.get("https://dummyjson.com/products/category/laptops")
  }
}

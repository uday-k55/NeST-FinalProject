import { Component } from '@angular/core';
import { Carousel } from "../../component/carousel/carousel";
import { Accordion } from "../../component/accordion/accordion";
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [Carousel, Accordion,RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  faqItems = [
  {
    title: 'Why Choose Us?',
    content: 'We provide quality products with competitive prices.'
  },
  {
    title: 'Product Categories',
    content: 'We offer latest mobiles and laptops.'
  },
  {
    title: 'Delivery Information',
    content: 'Fast and reliable delivery across all major locations.'
  }
];
}

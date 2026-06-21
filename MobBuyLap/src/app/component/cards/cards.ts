import { Component, Input, input } from '@angular/core';
import {RouterLink} from '@angular/router';
@Component({
  selector: 'app-cards',
  imports: [RouterLink],
  templateUrl: './cards.html',
  styleUrl: './cards.css',
})
export class Cards {
  [x: string]: any;
  @Input() product:any;
}

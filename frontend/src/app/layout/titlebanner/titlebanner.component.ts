import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-titlebanner',
  standalone: true,
  imports: [],
  templateUrl: './titlebanner.component.html',
  styleUrl: './titlebanner.component.css'
})
export class TitlebannerComponent {
  @Input() title: string = "Loading";
  @Input() image: string = "";
}

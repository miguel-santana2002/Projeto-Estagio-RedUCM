import { Component } from '@angular/core';
import { LoaderService } from '../loader.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spinner.component.html',
  styleUrl: './spinner.component.css'
})
export class SpinnerComponent {


    constructor(public loader: LoaderService) { }
  }

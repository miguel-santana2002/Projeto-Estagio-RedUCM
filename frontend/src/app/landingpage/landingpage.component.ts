import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../layout/header/header.component'; // Confirma o caminho relativo para o teu header

@Component({
  selector: 'app-landingpage',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent],
  templateUrl: './landingpage.component.html',
  styleUrl: './landingpage.component.css',
})
export class LandingpageComponent {}

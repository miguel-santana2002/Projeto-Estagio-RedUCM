import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';

import { AuthService } from './services/auth.service';
import { initFlowbite } from 'flowbite';
import { SpinnerComponent } from "./layout/spinner/spinner.component";

@Component({
    selector: 'app-root',
    standalone: true,
    templateUrl: './app.component.html',
    styleUrl: './app.component.css',
    imports: [
      CommonModule,
      RouterOutlet,
      MatButtonModule,
      MatToolbarModule,
      MatIconModule,
      MatSidenavModule,
      MatCheckboxModule,
      FormsModule,
      MatButtonModule,
      SpinnerComponent,

      
    ]
})
export class AppComponent implements OnInit {
  title = 'Front-end';
  isLogged: boolean = true;


  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.isLogged = this.authService.isLogged();
    initFlowbite();

  }

  openMenu() {
    console.log('open!');
  }

  logout() {
    this.authService.logout();
    this.isLogged = false;
    this.router.navigateByUrl(this.router.url, {
      onSameUrlNavigation: 'reload',
      skipLocationChange: true,
    });
  }
}

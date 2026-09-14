import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSidenavModule } from '@angular/material/sidenav';

import { AuthService } from './services/auth.service';
import { initFlowbite } from 'flowbite';
import { SpinnerComponent } from './layout/spinner/spinner.component';
import { LoaderService } from './layout/loader.service';

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
    SpinnerComponent,
  ],
})
export class AppComponent implements OnInit {
  title = 'Front-end';
  isLoginPage: boolean = false;
  currentYear: number = new Date().getFullYear();

  constructor(
    private authService: AuthService,
    private router: Router,
    public loaderService: LoaderService,
  ) {
    // Escuta mudanças de navegação
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects || event.url;
        this.isLoginPage = url.includes('/login');
      });
  }

  ngOnInit(): void {
    initFlowbite();
  }

  openMenu() {
    console.log('open!');
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterModule, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

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
    RouterModule,
    MatButtonModule,
    MatToolbarModule,
    MatIconModule,
    MatSidenavModule,
    MatCheckboxModule,
    FormsModule,
    SpinnerComponent,
  ],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Front-end';
  isLoginPage: boolean = false;
  currentYear: number = new Date().getFullYear();
  user: any = null;
  private navSub!: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    public loaderService: LoaderService,
  ) {
    // Escuta mudanças de navegação
    this.navSub = this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects || event.url;
        this.isLoginPage = url.includes('/login');
        this.checkAndLoadUser();
      });
  }

  get isAdmin(): boolean {
    return Boolean(this.user?.is_superuser || this.user?.is_admin);
  }

  ngOnInit(): void {
    initFlowbite();
    this.checkAndLoadUser();
  }

  ngOnDestroy(): void {
    if (this.navSub) {
      this.navSub.unsubscribe();
    }
  }

  checkAndLoadUser(): void {
    if (this.isLoginPage) {
      this.user = null;
      return;
    }

    if (this.authService.isLogged()) {
      this.authService.loggedInInfo().subscribe({
        next: (value: any) => {
          if (value && typeof value === 'object' && (value.username || value.email)) {
            this.user = value;
          } else {
            this.user = null;
          }
        },
        error: () => {
          this.user = null;
        },
      });
    } else {
      this.user = null;
    }
  }

  openMenu() {
    console.log('open!');
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

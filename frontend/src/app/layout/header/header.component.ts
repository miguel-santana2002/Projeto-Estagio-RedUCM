import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { initFlowbite } from 'flowbite';

import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent implements OnInit, OnDestroy {
  user: any = null;
  private navSub!: Subscription;

  constructor(
    public router: Router,
    private authService: AuthService,
    public themeService: ThemeService,
  ) {}

  get isLoggedIn(): boolean {
    return !!(this.user && (this.user.username || this.user.email));
  }

  ngOnInit(): void {
    // 1. Carrega dados no arranque
    this.checkAndLoadUser();

    // 2. Reavalia a cada navegação
    this.navSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.checkAndLoadUser();
      });
  }

  ngOnDestroy(): void {
    if (this.navSub) {
      this.navSub.unsubscribe();
    }
  }

  checkAndLoadUser(): void {
    const isPublicRoute =
      this.router.url === '/' ||
      this.router.url === '/login' ||
      this.router.url === '';
    const token =
      localStorage.getItem('token') ||
      sessionStorage.getItem('token') ||
      localStorage.getItem('access_token');

    if (!isPublicRoute || token) {
      this.authService.loggedInInfo().subscribe({
        next: (value: any) => {
          if (
            value &&
            typeof value === 'object' &&
            (value.username || value.email)
          ) {
            this.user = {
              ...value,
              companies: value.companies ?? [],
            };
          } else {
            this.user = null;
          }
          // INICIA O FLOWBITE APENAS DEPOIS DO DOM ATUALIZAR
          setTimeout(() => initFlowbite(), 50);
        },
        error: () => {
          this.user = null;
          setTimeout(() => initFlowbite(), 50);
        },
      });
    } else {
      this.user = null;
      setTimeout(() => initFlowbite(), 50);
    }
  }

  isRouteActive(routes: string[]): boolean {
    return routes.some((route) => this.router.url.startsWith(route));
  }

  logout(): void {
    this.authService.logout();
    this.user = null;
    this.router.navigate(['/']);
  }

  get isAdmin(): boolean {
    return Boolean(this.user?.is_superuser || this.user?.is_admin);
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { initFlowbite } from 'flowbite';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent implements OnInit {
  user: any = { username: '', companies: [] };

  constructor(
    public router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    initFlowbite();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        setTimeout(() => {
          initFlowbite();
        }, 50);
      });

    this.authService.loggedInInfo().subscribe((value) => {
      this.user = value || { username: '', companies: [] };
      if (this.user.companies == null) {
        this.user.companies = [];
      }
    });
  }

  isRouteActive(routes: string[]): boolean {
    return routes.some((route) => this.router.url.startsWith(route));
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}

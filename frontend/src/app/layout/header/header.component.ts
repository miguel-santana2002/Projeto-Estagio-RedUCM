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
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // 1. Inicializa o Flowbite no primeiro carregamento
    initFlowbite();

    // 2. Reinicializa os listeners de dropdowns/drawers a cada transição de rota terminada
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        setTimeout(() => {
          initFlowbite();
        }, 50);
      });

    // 3. Obtém informação do utilizador autenticado
    this.authService.loggedInInfo().subscribe((value) => {
      this.user = value || { username: '', companies: [] };
      if (this.user.companies == null) {
        this.user.companies = [];
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}

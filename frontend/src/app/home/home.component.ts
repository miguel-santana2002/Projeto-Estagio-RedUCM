import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../layout/header/header.component';
import { TitlebannerComponent } from '../layout/titlebanner/titlebanner.component';
import { AuthService } from '../services/auth.service';
import { UsecasesService } from '../services/usecases.service';
import { RulesService } from '../services/rules.service';
import { RouterModule } from '@angular/router';

import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  imports: [CommonModule, HeaderComponent, TitlebannerComponent, RouterModule],
})
export class HomeComponent implements OnInit {
  user: any = { username: '', companies: [] };
  isLoading: boolean = true;
  numberOfUseCases: number = 0;
  numberOfRules: number = 0;
  numberOfClients: number = 0;
  numberOfLogSources: number = 0;

  constructor(
    private authService: AuthService,
    private useCasesService: UsecasesService,
    private rulesService: RulesService,
  ) {}

  ngOnInit() {
    this.authService.loggedInInfo().subscribe((value) => {
      this.user = value;
      if (this.user.companies == null) {
        this.user.companies = [];
      }
    });

    this.isLoading = true;
    // Carregar todas as contagens em paralelo
    forkJoin({
      useCases: this.useCasesService.getUseCases(),
      rules: this.rulesService.getRules(),
      clients: this.authService.getClients(),
      logSources: this.rulesService.getRegisteredLogSources(),
    }).subscribe({
      next: ({ useCases, rules, clients, logSources }) => {
        this.numberOfUseCases = Array.isArray(useCases) ? useCases.length : 0;
        this.numberOfRules = Array.isArray(rules) ? rules.length : 0;
        this.numberOfClients = Array.isArray(clients) ? clients.length : 0;
        this.numberOfLogSources = Array.isArray(logSources) ? logSources.length : 0;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar métricas da home:', err);
        this.isLoading = false;
      },
    });
  }

  get userRoleLabel(): string {
    return this.isAdmin ? 'Administrador' : 'Operador';
  }

  get isAdmin(): boolean {
    return Boolean(this.user?.is_superuser || this.user?.is_admin);
  }
}

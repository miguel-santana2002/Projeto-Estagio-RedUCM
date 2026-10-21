import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { HeaderComponent } from '../../layout/header/header.component';
import { TitlebannerComponent } from '../../layout/titlebanner/titlebanner.component';
import { RulesService } from '../../services/rules.service';
import { UsecasesService } from '../../services/usecases.service';
import { AuthService } from '../../services/auth.service';

import { RulesPerSyntaxComponent } from '../rules-per-syntax/rules-per-syntax.component';
import { RulesPerLogsourceComponent } from '../rules-per-logsource/rules-per-logsource.component';
import { RulesPerTypeComponent } from '../rules-per-type/rules-per-type.component';
import { RadarTacticsComponent } from '../radar-tactics/radar-tactics.component';

@Component({
  selector: 'app-statistics-page',
  standalone: true,
  templateUrl: './statistics-page.component.html',
  styleUrl: './statistics-page.component.css',
  imports: [
    HeaderComponent,
    FormsModule,
    TitlebannerComponent,
    RulesPerSyntaxComponent,
    CommonModule,
    RulesPerLogsourceComponent,
    RulesPerTypeComponent,
    RadarTacticsComponent,
  ],
})
export class StatisticsPageComponent implements OnInit {
  rules: any[] = [];
  filteredRules: any[] = [];
  useCases: any[] = [];
  users: any[] = [];
  clientsFromBd: any[] = [];
  logsourcesFromBd: any[] = [];

  mitreTechniques: string[] = [];
  mitreTechniquesCount: number[] = [];

  clients: string[] = [];
  clientsCount: number[] = [];

  uniqueClientsName: string[] = [];
  selectedClients: string[] = [];

  // Controlo do Painel de Filtros e Carregamento
  showFilters: boolean = false;
  isLoading: boolean = true;

  constructor(
    private cdr: ChangeDetectorRef,
    private rulesService: RulesService,
    private useCasesService: UsecasesService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadAllStatistics();
  }

  loadAllStatistics(): void {
    this.isLoading = true;

    // Disparar todos os pedidos em paralelo simultaneamente via forkJoin
    forkJoin({
      rules: this.rulesService.getRules(),
      useCases: this.useCasesService.getUseCases(),
      users: this.authService.getUsers(),
      clients: this.authService.getClients(),
      logSources: this.rulesService.getRegisteredLogSources(),
    }).subscribe({
      next: ({ rules, useCases, users, clients, logSources }) => {
        this.rules = Array.isArray(rules) ? rules : [];
        this.filteredRules = [...this.rules];
        this.useCases = Array.isArray(useCases) ? useCases : [];
        this.users = Array.isArray(users) ? users : [];
        this.clientsFromBd = Array.isArray(clients) ? clients : [];
        this.logsourcesFromBd = Array.isArray(logSources) ? logSources : [];

        this.uniqueClientsName = Array.from(
          new Set(
            this.clientsFromBd
              .map((item: any) => item.name)
              .filter((name: string) => Boolean(name)),
          ),
        ).sort();

        this.mitreTableGenerate();
        this.clientsTableGenerate();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao carregar estatísticas:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // Toggles e Métodos de Filtro por Pills
  toggleClient(client: string): void {
    if (this.selectedClients.includes(client)) {
      this.selectedClients = this.selectedClients.filter((c) => c !== client);
    } else {
      this.selectedClients = [...this.selectedClients, client];
    }
    this.applyFilters();
  }

  isClientSelected(client: string): boolean {
    return this.selectedClients.includes(client);
  }

  applyFilters(): void {
    if (this.selectedClients.length === 0) {
      this.filteredRules = [...this.rules];
    } else {
      this.filteredRules = this.rules.filter((rule: any) =>
        this.selectedClients.includes(rule.client?.name),
      );
    }
  }

  clearSelectedClients(): void {
    this.selectedClients = [];
    this.filteredRules = [...this.rules];
  }

  clearAllFilters(): void {
    this.clearSelectedClients();
  }

  mitreTableGenerate(): void {
    const counts = new Map<string, number>();

    for (const useCase of this.useCases) {
      if (Array.isArray(useCase.mitreTechniques)) {
        for (const technique of useCase.mitreTechniques) {
          const techName =
            typeof technique === 'string'
              ? technique
              : technique?.id || technique?.name;
          if (techName) {
            counts.set(techName, (counts.get(techName) || 0) + 1);
          }
        }
      }
    }

    // Ordenar por frequência decrescente
    const sorted = Array.from(counts.entries())
      .map(([technique, count]) => ({ technique, count }))
      .sort((a, b) => b.count - a.count);

    this.mitreTechniques = sorted.map((item) => item.technique);
    this.mitreTechniquesCount = sorted.map((item) => item.count);
  }

  clientsTableGenerate(): void {
    const counts = new Map<string, number>();

    for (const rule of this.rules) {
      const clientName = rule.client?.name;
      if (clientName) {
        counts.set(clientName, (counts.get(clientName) || 0) + 1);
      }
    }

    // Ordenar por frequência decrescente
    const sorted = Array.from(counts.entries())
      .map(([client, count]) => ({ client, count }))
      .sort((a, b) => b.count - a.count);

    this.clients = sorted.map((item) => item.client);
    this.clientsCount = sorted.map((item) => item.count);
  }

  trackByClient(index: number, client: string): string {
    return client;
  }

  trackByTechnique(index: number, technique: string): string {
    return technique;
  }
}


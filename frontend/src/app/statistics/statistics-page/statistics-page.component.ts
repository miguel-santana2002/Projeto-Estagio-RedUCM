import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  ruleModels: any[] = [];
  users: any[] = [];
  clientsFromBd: any[] = [];

  mitreTechniques: string[] = [];
  mitreTechniquesCount: number[] = [];

  clients: string[] = [];
  clientsCount: number[] = [];

  uniqueClientsName: string[] = [];
  selectedClients: string[] = [];

  // Controlo do Painel de Filtros
  showFilters: boolean = false;

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
    this.rulesService.getRules().subscribe((rulesData: any) => {
      console.log('Regras recebidas nas estatísticas:', rulesData);
      this.rules = Array.isArray(rulesData) ? rulesData : [];
      this.filteredRules = [...this.rules];

      this.useCasesService.getUseCases().subscribe((useCasesData: any) => {
        this.useCases = Array.isArray(useCasesData) ? useCasesData : [];

        this.rulesService.getRuleModels().subscribe((ruleModelsData: any) => {
          this.ruleModels = Array.isArray(ruleModelsData) ? ruleModelsData : [];

          this.authService.getUsers().subscribe((usersData: any) => {
            this.users = Array.isArray(usersData) ? usersData : [];

            this.authService.getClients().subscribe((clientsData: any) => {
              this.clientsFromBd = Array.isArray(clientsData)
                ? clientsData
                : [];

              this.uniqueClientsName = Array.from(
                new Set(
                  this.clientsFromBd
                    .map((item: any) => item.name)
                    .filter((name: string) => Boolean(name)),
                ),
              ).sort();

              this.mitreTableGenerate();
              this.clientsTableGenerate();
            });
          });
        });
      });
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
    this.mitreTechniques = [];
    this.mitreTechniquesCount = [];

    this.useCases.forEach((useCase: any) => {
      if (Array.isArray(useCase.mitreTechniques)) {
        useCase.mitreTechniques.forEach((technique: any) => {
          const techName =
            typeof technique === 'string'
              ? technique
              : technique?.id || technique?.name;
          if (!techName) return;

          const index = this.mitreTechniques.indexOf(techName);
          if (index === -1) {
            this.mitreTechniques.push(techName);
            this.mitreTechniquesCount.push(1);
          } else {
            this.mitreTechniquesCount[index]++;
          }
        });
      }
    });

    // Ordenar por frequência decrescente
    const combined = this.mitreTechniques.map((tech, i) => ({
      technique: tech,
      count: this.mitreTechniquesCount[i],
    }));

    combined.sort((a, b) => b.count - a.count);

    this.mitreTechniques = combined.map((item) => item.technique);
    this.mitreTechniquesCount = combined.map((item) => item.count);
  }

  clientsTableGenerate(): void {
    this.clients = [];
    this.clientsCount = [];

    this.rules.forEach((rule: any) => {
      const clientName = rule.client?.name;
      if (!clientName) return;

      const index = this.clients.indexOf(clientName);
      if (index === -1) {
        this.clients.push(clientName);
        this.clientsCount.push(1);
      } else {
        this.clientsCount[index]++;
      }
    });
  }
}

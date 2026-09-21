import { CommonModule, DatePipe } from '@angular/common';
import {
  Component,
  ElementRef,
  ViewChild,
  OnInit,
  AfterViewInit,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Modal } from 'flowbite';

import { TitlebannerComponent } from '../../../layout/titlebanner/titlebanner.component';
import { HeaderComponent } from '../../../layout/header/header.component';
import { AuthService } from '../../../services/auth.service';
import { RulesService } from '../../../services/rules.service';

@Component({
  selector: 'app-manage-rules',
  standalone: true,
  imports: [
    HeaderComponent,
    FormsModule,
    CommonModule,
    DatePipe,
    TitlebannerComponent,
    RouterModule,
  ],
  templateUrl: './manage-rules.component.html',
  styleUrl: './manage-rules.component.css',
})
export class ManageRulesComponent implements OnInit, AfterViewInit {
  @ViewChild('modal') modal!: ElementRef<HTMLElement>;
  modalFlowbite!: Modal;

  sortType = 'id';
  sortReverse = false;
  nameSearch: string = '';
  selectDelete: number = 999999;

  rules: any[] = [];

  // Controlo do Painel de Filtros
  showFilters: boolean = false;

  // Filtros Selecionados
  selectedTypes: string[] = [];
  selectedSintaxes: string[] = [];
  selectedUseCases: (string | number)[] = [];
  selectedClients: string[] = [];
  selectedLogsources: string[] = [];

  // Opções Únicas para as Pills
  uniqueTypes: string[] = [];
  uniqueSintaxes: string[] = [];
  uniqueUseCases: (string | number)[] = [];
  uniqueClients: string[] = [];
  uniqueLogsources: string[] = [];

  constructor(
    private authService: AuthService,
    private rulesService: RulesService,
  ) {}

  ngOnInit(): void {
    this.loadRules();
  }

  ngAfterViewInit(): void {
    if (this.modal?.nativeElement) {
      this.modalFlowbite = new Modal(this.modal.nativeElement);
    }
  }

  loadRules(): void {
    this.rulesService.getRules().subscribe({
      next: (data: any) => {
        this.rules = Array.isArray(data) ? data : [];
        this.startFilters();
        this.rules.sort((a: any, b: any) => this.sortNumeric(a.id, b.id));
      },
      error: (err) => console.error('Erro ao carregar regras:', err),
    });
  }

  startFilters(): void {
    this.uniqueClients = Array.from(
      new Set(
        this.rules
          .map((item: any) => item.client?.name)
          .filter((name): name is string => Boolean(name)),
      ),
    ).sort();

    this.uniqueTypes = Array.from(
      new Set(
        this.rules
          .map((item: any) => item.ruleModel?.type)
          .filter((type): type is string => Boolean(type)),
      ),
    ).sort();

    this.uniqueSintaxes = Array.from(
      new Set(
        this.rules
          .map((item: any) => item.ruleModel?.syntax || item.syntax)
          .filter((syntax): syntax is string => Boolean(syntax)),
      ),
    ).sort();

    this.uniqueUseCases = Array.from(
      new Set(
        this.rules
          .map((item: any) => item.ruleModel?.useCaseId)
          .filter(
            (uc): uc is number | string => uc !== null && uc !== undefined,
          ),
      ),
    ).sort((a: any, b: any) => Number(a) - Number(b));

    this.uniqueLogsources = Array.from(
      new Set(
        this.rules
          .flatMap(
            (item: any) => item.logsources ?? item.ruleModel?.logsources ?? [],
          )
          .filter((log): log is string => Boolean(log)),
      ),
    ).sort();
  }

  // Toggles de Seleção (Pills)
  toggleClient(client: string): void {
    this.selectedClients = this.selectedClients.includes(client)
      ? this.selectedClients.filter((c) => c !== client)
      : [...this.selectedClients, client];
  }

  toggleType(type: string): void {
    this.selectedTypes = this.selectedTypes.includes(type)
      ? this.selectedTypes.filter((t) => t !== type)
      : [...this.selectedTypes, type];
  }

  toggleSyntax(syntax: string): void {
    this.selectedSintaxes = this.selectedSintaxes.includes(syntax)
      ? this.selectedSintaxes.filter((s) => s !== syntax)
      : [...this.selectedSintaxes, syntax];
  }

  toggleUseCase(uc: string | number): void {
    this.selectedUseCases = this.selectedUseCases.includes(uc)
      ? this.selectedUseCases.filter((u) => u !== uc)
      : [...this.selectedUseCases, uc];
  }

  toggleLogsource(log: string): void {
    this.selectedLogsources = this.selectedLogsources.includes(log)
      ? this.selectedLogsources.filter((l) => l !== log)
      : [...this.selectedLogsources, log];
  }

  // Limpeza
  clearAllFilters(): void {
    this.selectedClients = [];
    this.selectedTypes = [];
    this.selectedSintaxes = [];
    this.selectedUseCases = [];
    this.selectedLogsources = [];
  }

  // Ordenação com suporte para campos aninhados e nulos
  sortTable(column: string): void {
    if (this.sortType === column) {
      this.sortReverse = !this.sortReverse;
    } else {
      this.sortType = column;
      this.sortReverse = false;
    }

    this.rules.sort((a: any, b: any) => {
      let valA: any;
      let valB: any;

      switch (column) {
        case 'title':
        case 'ruleModel':
          valA = a.ruleModel?.title || '';
          valB = b.ruleModel?.title || '';
          break;
        case 'client':
          valA = a.client?.name || '';
          valB = b.client?.name || '';
          break;
        case 'useCaseId':
          valA = a.ruleModel?.useCaseId ?? 0;
          valB = b.ruleModel?.useCaseId ?? 0;
          break;
        case 'type':
          valA = a.ruleModel?.type || '';
          valB = b.ruleModel?.type || '';
          break;
        case 'syntax':
          valA = a.syntax || a.ruleModel?.syntax || '';
          valB = b.syntax || b.ruleModel?.syntax || '';
          break;
        case 'logsources':
          valA = (a.logsources ?? []).length;
          valB = (b.logsources ?? []).length;
          break;
        default:
          valA = a[column];
          valB = b[column];
      }

      if (valA == null && valB != null) return this.sortReverse ? -1 : 1;
      if (valA != null && valB == null) return this.sortReverse ? 1 : -1;
      if (valA == null && valB == null) return 0;

      if (typeof valA === 'string') {
        return this.sortString(valA, valB);
      }
      return this.sortNumeric(valA, valB);
    });
  }

  private sortString(a: string = '', b: string = ''): number {
    return a.localeCompare(b) * (this.sortReverse ? -1 : 1);
  }

  private sortNumeric(a: number = 0, b: number = 0): number {
    return (a - b) * (this.sortReverse ? -1 : 1);
  }

  // Filtragem Reativa Segura
  get filteredRules(): any[] {
    const term = this.nameSearch.trim().toLowerCase();

    return this.rules.filter((rule: any) => {
      // 1. Pesquisa por Título do Modelo ou Código da Regra
      const ruleTitle = rule.ruleModel?.title?.toLowerCase() || '';
      const ruleCode = rule.ruleCode?.toLowerCase() || '';
      const matchesName =
        !term || ruleTitle.includes(term) || ruleCode.includes(term);

      // 2. Filtro Tipo
      const matchesType =
        this.selectedTypes.length === 0 ||
        (rule.ruleModel?.type &&
          this.selectedTypes.includes(rule.ruleModel.type));

      // 3. Filtro Sintaxe
      const currentSyntax = rule.syntax || rule.ruleModel?.syntax;
      const matchesSyntax =
        this.selectedSintaxes.length === 0 ||
        (currentSyntax && this.selectedSintaxes.includes(currentSyntax));

      // 4. Filtro Use Case
      const matchesUseCase =
        this.selectedUseCases.length === 0 ||
        (rule.ruleModel?.useCaseId != null &&
          this.selectedUseCases.includes(rule.ruleModel.useCaseId));

      // 5. Filtro Cliente
      const matchesClient =
        this.selectedClients.length === 0 ||
        (rule.client?.name && this.selectedClients.includes(rule.client.name));

      // 6. Filtro Logsources
      const logs = rule.logsources ?? rule.ruleModel?.logsources ?? [];
      const matchesLogs =
        this.selectedLogsources.length === 0 ||
        this.selectedLogsources.some((r: string) => logs.includes(r));

      return (
        matchesName &&
        matchesType &&
        matchesSyntax &&
        matchesUseCase &&
        matchesClient &&
        matchesLogs
      );
    });
  }

  // Modal Eliminar
  updateSelectDelete(event: Event, id: number): void {
    event.stopPropagation();
    this.selectDelete = id;
  }

  openModal(): void {
    this.modalFlowbite?.show();
  }

  closeModal(): void {
    this.modalFlowbite?.hide();
  }

  deleteRuleModel(): void {
    this.rulesService.deleteRuleById(this.selectDelete).subscribe({
      next: () => {
        this.loadRules();
      },
      error: (err) => console.error('Erro ao eliminar regra:', err),
    });
  }
}

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

  isAdmin: boolean = false; // Controlo de permissões (Admin / Superuser)

  sortType = 'id';
  sortReverse = false;
  nameSearch: string = '';
  selectDelete: number = 999999;

  rules: any[] = [];

  // Paginação
  page: number = 1;
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];

  // Controlo do Painel de Filtros
  showFilters: boolean = false;

  // Opções de Estado Disponíveis
  statusOptions = [
    { value: '', label: '(Vazio)' },
    { value: 'Regra validada', label: 'Regra validada' },
    { value: 'Regra nao validada', label: 'Regra não validada' }
  ];

  // Filtros Selecionados
  selectedTypes: string[] = [];
  selectedSintaxes: string[] = [];
  selectedUseCases: (string | number)[] = [];
  selectedClients: string[] = [];
  selectedStatus: string[] = [];

  // Opções Únicas para as Pills
  uniqueTypes: string[] = [];
  uniqueSintaxes: string[] = [];
  uniqueUseCases: (string | number)[] = [];
  uniqueClients: string[] = [];

  constructor(
    private authService: AuthService,
    private rulesService: RulesService,
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadRules();
  }

  ngAfterViewInit(): void {
    if (this.modal?.nativeElement) {
      this.modalFlowbite = new Modal(this.modal.nativeElement);
    }
  }

  loadUserInfo(): void {
    this.authService.loggedInInfo().subscribe({
      next: (data: any) => {
        this.isAdmin = Boolean(data?.is_superuser || data?.is_admin);
      },
      error: (err) => {
        console.error('Erro ao carregar dados do utilizador:', err);
        this.isAdmin = false;
      },
    });
  }

  loadRules(): void {
    this.rulesService.getRules().subscribe({
      next: (data: any) => {
        this.rules = Array.isArray(data) ? data.map(rule => ({
          ...rule,
          status: rule.status || ''
        })) : [];
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
  }

  // Estilo limpo: Texto destacado e borda subtil sem escurecer a tabela
  getStatusClasses(status: string): string {
    switch(status) {
      case 'Regra validada':
        return 'text-gray-300 font-bold border border-gray-600 bg-gray-700/30';
      case 'Regra nao validada':
        return 'text-gray-300 border border-redshift-red/40 bg-redshift-red/5';
      default:
        return 'text-gray-400 border border-dashed border-gray-600 bg-transparent';
    }
  }

  // Função única e limpa para atualizar o estado diretamente na tabela
  updateRuleStatus(rule: any): void {
    const payload = {
      client: rule.client?.id || rule.client?.pk || null,
      status: rule.status || '',
      syntax: rule.syntax || rule.ruleModel?.syntax || '',
      logsources: rule.logsources || [],
      ruleCode: rule.ruleCode || ''
    };
    
    this.rulesService.updateRule(rule.id, payload).subscribe({
      next: () => {
        console.log(`Estado da regra ${rule.id} atualizado para ${rule.status}`);
      },
      error: (err: any) => {
        console.error('Erro ao atualizar estado:', err);
        this.loadRules(); 
      }
    });
  }

  // Toggles de Seleção com Reset de Página
  toggleClient(client: string): void {
    this.page = 1;
    this.selectedClients = this.selectedClients.includes(client)
      ? this.selectedClients.filter((c) => c !== client)
      : [...this.selectedClients, client];
  }

  toggleType(type: string): void {
    this.page = 1;
    this.selectedTypes = this.selectedTypes.includes(type)
      ? this.selectedTypes.filter((t) => t !== type)
      : [...this.selectedTypes, type];
  }

  toggleSyntax(syntax: string): void {
    this.page = 1;
    this.selectedSintaxes = this.selectedSintaxes.includes(syntax)
      ? this.selectedSintaxes.filter((s) => s !== syntax)
      : [...this.selectedSintaxes, syntax];
  }

  toggleUseCase(uc: string | number): void {
    this.page = 1;
    this.selectedUseCases = this.selectedUseCases.includes(uc)
      ? this.selectedUseCases.filter((u) => u !== uc)
      : [...this.selectedUseCases, uc];
  }

  toggleStatus(status: string): void {
    this.page = 1;
    this.selectedStatus = this.selectedStatus.includes(status)
      ? this.selectedStatus.filter((s) => s !== status)
      : [...this.selectedStatus, status];
  }

  // Limpeza
  clearAllFilters(): void {
    this.page = 1;
    this.selectedClients = [];
    this.selectedTypes = [];
    this.selectedSintaxes = [];
    this.selectedUseCases = [];
    this.selectedStatus = [];
    this.nameSearch = '';
  }

  onSearchChange(): void {
    this.page = 1;
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
        case 'status':
          valA = a.status || '';
          valB = b.status || '';
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
      const ruleTitle = rule.ruleModel?.title?.toLowerCase() || '';
      const ruleCode = rule.ruleCode?.toLowerCase() || '';
      const matchesName =
        !term || ruleTitle.includes(term) || ruleCode.includes(term);

      const matchesType =
        this.selectedTypes.length === 0 ||
        (rule.ruleModel?.type &&
          this.selectedTypes.includes(rule.ruleModel.type));

      const currentSyntax = rule.syntax || rule.ruleModel?.syntax;
      const matchesSyntax =
        this.selectedSintaxes.length === 0 ||
        (currentSyntax && this.selectedSintaxes.includes(currentSyntax));

      const matchesUseCase =
        this.selectedUseCases.length === 0 ||
        (rule.ruleModel?.useCaseId != null &&
          this.selectedUseCases.includes(rule.ruleModel.useCaseId));

      const matchesClient =
        this.selectedClients.length === 0 ||
        (rule.client?.name && this.selectedClients.includes(rule.client.name));
        
      const matchesStatus = 
        this.selectedStatus.length === 0 ||
        (rule.status && this.selectedStatus.includes(rule.status));

      return (
        matchesName &&
        matchesType &&
        matchesSyntax &&
        matchesUseCase &&
        matchesClient &&
        matchesStatus
      );
    });
  }

  // Segmentação Paginada
  get pagedRules(): any[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredRules.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRules.length / this.pageSize) || 1;
  }

  setPage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.page = newPage;
    }
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = Number(newSize);
    this.page = 1;
  }

  // Gestão de Modal Eliminar
  updateSelectDelete(event: Event, id: number): void {
    event.stopPropagation();
    if (!this.isAdmin) return;
    this.selectDelete = id;
  }

  openModal(): void {
    if (!this.isAdmin) return;
    this.modalFlowbite?.show();
  }

  closeModal(): void {
    this.modalFlowbite?.hide();
  }

  deleteRuleModel(): void {
    if (!this.isAdmin) return;

    this.rulesService.deleteRuleById(this.selectDelete).subscribe({
      next: () => {
        this.loadRules();
        if (this.page > this.totalPages) {
          this.page = this.totalPages;
        }
        this.closeModal();
      },
      error: (err) => console.error('Erro ao eliminar regra:', err),
    });
  }

  exportSigmaRule(event: Event, rule: any): void {
    event.stopPropagation();

    const yamlContent = rule.ruleCode;
    if (!yamlContent) {
      console.warn(
        `A regra ID ${rule.id} não possui conteúdo no campo ruleCode.`,
      );
      return;
    }

    const rawTitle = rule.ruleModel?.title || 'rule';
    const sanitizedTitle = rawTitle
      .trim()
      .replace(/\s*-\s*/g, '-')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .replace(/_+/g, '_');

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `RedRule${rule.id}_${sanitizedTitle}_${dateStr}.yml`;

    const blob = new Blob([yamlContent], { type: 'text/yaml;charset=utf-8' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = downloadUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();

    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

import { CommonModule, DatePipe } from '@angular/common';
import {
  Component,
  ElementRef,
  ViewChild,
  OnInit,
  AfterViewInit,
  HostListener,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Modal } from 'flowbite';

import { TitlebannerComponent } from '../../../layout/titlebanner/titlebanner.component';
import { HeaderComponent } from '../../../layout/header/header.component';
import { AuthService } from '../../../services/auth.service';
import { RulesService } from '../../../services/rules.service';
import { normalizeSearchText, tokenizeQuery } from '../../../helper/search-utils';
import { exportRuleFormatted, ExportFormat } from '../../../shared/utils/rule-export.util';

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

  isAdmin: boolean = false;

  sortType = 'id';
  sortReverse = false;
  nameSearch: string = '';
  selectDelete: number = 999999;

  rules: any[] = [];
  filteredRules: any[] = [];
  pagedRules: any[] = [];

  // Paginação
  page: number = 1;
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];

  showFilters: boolean = false;

  statusOptions = [
    { value: '', label: '(Vazio)' },
    { value: 'Regra validada', label: 'Regra validada' },
    { value: 'Regra não validada', label: 'Regra não validada' },
  ];

  selectedHierarchy: string = 'all'; // 'all' | 'principal' | 'child'

  selectedTypes: string[] = [];
  selectedSintaxes: string[] = [];
  selectedLogSources: string[] = [];
  selectedStatus: string[] = [];

  uniqueTypes: string[] = [];
  uniqueSintaxes: string[] = [];
  uniqueLogSources: string[] = [];

  get countPrincipal(): number {
    return this.rules.filter((r: any) => !r.parent && r.parent !== 0).length;
  }

  get countChild(): number {
    return this.rules.filter((r: any) => Boolean(r.parent || r.parent === 0)).length;
  }

  setHierarchyFilter(type: string): void {
    this.selectedHierarchy = type;
    this.page = 1;
    this.applyFilters();
  }

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
        this.rules = Array.isArray(data)
          ? data.map((rule) => {
              const ruleTitle = rule.title || rule.ruleModel?.title || '';
              const ruleCode = rule.ruleCode || '';
              const ruleType = rule.type || rule.ruleModel?.type || '';
              const currentSyntax = rule.syntax || rule.ruleModel?.syntax || '';
              const ruleLogs = this.getRuleLogSources(rule);
              const clientName =
                typeof rule.client === 'object' && rule.client?.name
                  ? rule.client.name
                  : typeof rule.client === 'string'
                    ? rule.client
                    : '';
              const modelId = rule.ruleModel?.id ? `RedModel${rule.ruleModel.id}` : '';
              const ruleIdStr = rule.id ? `RedRule${rule.id}` : '';
              const isPrincipal = !rule.parent && rule.parent !== 0;
              const parentIdStr = rule.parent ? `RedRule${rule.parent}` : '';
              const hierarchyText = isPrincipal ? 'principal matriz' : `secundaria secundária filho child ${parentIdStr}`;

              const searchCorpus = normalizeSearchText([
                rule.id,
                ruleIdStr,
                modelId,
                ruleTitle,
                ruleCode.length > 500 ? ruleCode.substring(0, 500) : ruleCode,
                ruleType,
                currentSyntax,
                ruleLogs.join(' '),
                clientName,
                rule.status,
                rule.generationStatus,
                hierarchyText,
                parentIdStr,
              ].join(' '));

              return {
                ...rule,
                status: (rule.status || '').trim(),
                _logSources: ruleLogs,
                _isPrincipal: isPrincipal,
                _searchCorpus: searchCorpus,
              };
            })
          : [];
        this.startFilters();
        this.rules.sort((a: any, b: any) => this.sortNumeric(a.id, b.id));
        this.applyFilters();
      },
      error: (err) => console.error('Erro ao carregar regras:', err),
    });
  }

  startFilters(): void {
    this.uniqueTypes = Array.from(
      new Set(
        this.rules
          .map((item: any) => item.type || item.ruleModel?.type)
          .filter((type): type is string => Boolean(type)),
      ),
    ).sort();

    this.uniqueSintaxes = Array.from(
      new Set(
        this.rules
          .map((item: any) => item.syntax || item.ruleModel?.syntax)
          .filter((syntax): syntax is string => Boolean(syntax)),
      ),
    ).sort();

    this.uniqueLogSources = Array.from(
      new Set(
        this.rules
          .flatMap((item: any) => this.getRuleLogSources(item))
          .filter((log): log is string => Boolean(log)),
      ),
    ).sort();
  }

  getStatusClasses(status: string): string {
    switch (status) {
      case 'Regra validada':
        return 'text-green-400 font-semibold border border-green-600/40 bg-green-950/20';
      case 'Regra não validada':
        return 'text-amber-400 font-medium border border-amber-600/40 bg-amber-950/20';
      default:
        return 'text-gray-400 border border-dashed border-gray-600 bg-transparent';
    }
  }

  // Atualização direta e envio de payload completo
  updateRuleStatus(rule: any): void {
    const payload = {
      ruleModel: rule.ruleModel?.id ?? rule.ruleModel ?? null,
      client:
        rule.client?.id ??
        rule.client?.pk ??
        (typeof rule.client === 'number' ? rule.client : null),
      status: rule.status || '',
      syntax: rule.syntax || rule.ruleModel?.syntax || '',
      logsources: rule.logsources || [],
      ruleCode: rule.ruleCode || '',
    };

    this.rulesService.updateRule(rule.id, payload).subscribe({
      next: (res: any) => {
        // Confirma a persistência do valor retornado
        if (res && res.status !== undefined) {
          rule.status = res.status;
          this.applyFilters();
        }
      },
      error: (err: any) => {
        console.error('Erro ao atualizar estado da regra:', err);
        // Recarrega em caso de erro para não manter dados inconsistentes na UI
        this.loadRules();
      },
    });
  }

  toggleLogSource(logSource: string): void {
    this.page = 1;
    this.selectedLogSources = this.selectedLogSources.includes(logSource)
      ? this.selectedLogSources.filter((l) => l !== logSource)
      : [...this.selectedLogSources, logSource];
    this.applyFilters();
  }

  isLogSourceSelected(logSource: string): boolean {
    return this.selectedLogSources.includes(logSource);
  }

  toggleType(type: string): void {
    this.page = 1;
    this.selectedTypes = this.selectedTypes.includes(type)
      ? this.selectedTypes.filter((t) => t !== type)
      : [...this.selectedTypes, type];
    this.applyFilters();
  }

  toggleSyntax(syntax: string): void {
    this.page = 1;
    this.selectedSintaxes = this.selectedSintaxes.includes(syntax)
      ? this.selectedSintaxes.filter((s) => s !== syntax)
      : [...this.selectedSintaxes, syntax];
    this.applyFilters();
  }

  toggleStatus(status: string): void {
    this.page = 1;
    this.selectedStatus = this.selectedStatus.includes(status)
      ? this.selectedStatus.filter((s) => s !== status)
      : [...this.selectedStatus, status];
    this.applyFilters();
  }

  clearAllFilters(): void {
    this.page = 1;
    this.selectedHierarchy = 'all';
    this.selectedLogSources = [];
    this.selectedTypes = [];
    this.selectedSintaxes = [];
    this.selectedStatus = [];
    this.nameSearch = '';
    this.applyFilters();
  }

  onSearchChange(): void {
    this.page = 1;
    this.applyFilters();
  }

  getRuleLogSources(rule: any): string[] {
    const directLogs = Array.isArray(rule?.logsources)
      ? rule.logsources.filter((l: string) => Boolean(l))
      : [];
    if (directLogs.length > 0) {
      return directLogs;
    }
    const modelLogs = Array.isArray(rule?.ruleModel?.logsources)
      ? rule.ruleModel.logsources.filter((l: string) => Boolean(l))
      : [];
    return modelLogs;
  }

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
          valA = a.title || a.ruleModel?.title || '';
          valB = b.title || b.ruleModel?.title || '';
          break;
        case 'logsources':
          valA = this.getRuleLogSources(a).join(', ');
          valB = this.getRuleLogSources(b).join(', ');
          break;
        case 'type':
          valA = a.type || a.ruleModel?.type || '';
          valB = b.type || b.ruleModel?.type || '';
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
    this.applyFilters();
  }

  private sortString(a: string = '', b: string = ''): number {
    return a.localeCompare(b) * (this.sortReverse ? -1 : 1);
  }

  private sortNumeric(a: number = 0, b: number = 0): number {
    return (a - b) * (this.sortReverse ? -1 : 1);
  }

  applyFilters(): void {
    const tokens = tokenizeQuery(this.nameSearch);

    this.filteredRules = this.rules.filter((rule: any) => {
      const matchesSearch =
        tokens.length === 0 || tokens.every((token) => rule._searchCorpus.includes(token));

      const matchesHierarchy =
        this.selectedHierarchy === 'all' ||
        (this.selectedHierarchy === 'principal' && rule._isPrincipal) ||
        (this.selectedHierarchy === 'child' && !rule._isPrincipal);

      const matchesType =
        this.selectedTypes.length === 0 ||
        (rule.type && this.selectedTypes.includes(rule.type)) ||
        (rule.ruleModel?.type && this.selectedTypes.includes(rule.ruleModel.type));

      const matchesSyntax =
        this.selectedSintaxes.length === 0 ||
        (rule.syntax && this.selectedSintaxes.includes(rule.syntax)) ||
        (rule.ruleModel?.syntax && this.selectedSintaxes.includes(rule.ruleModel.syntax));

      const ruleLogList = rule._logSources || this.getRuleLogSources(rule);
      const matchesLogSources =
        this.selectedLogSources.length === 0 ||
        ruleLogList.some((log: string) => this.selectedLogSources.includes(log));

      const matchesStatus =
        this.selectedStatus.length === 0 ||
        (rule.status && this.selectedStatus.includes(rule.status));

      return (
        matchesSearch &&
        matchesHierarchy &&
        matchesType &&
        matchesSyntax &&
        matchesLogSources &&
        matchesStatus
      );
    });

    this.updatePagedRules();
  }

  updatePagedRules(): void {
    const start = (this.page - 1) * this.pageSize;
    this.pagedRules = this.filteredRules.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRules.length / this.pageSize) || 1;
  }

  setPage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.page = newPage;
      this.updatePagedRules();
    }
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = Number(newSize);
    this.page = 1;
    this.updatePagedRules();
  }

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

  activeExportMenuRuleId: number | null = null;

  toggleExportMenu(event: Event, ruleId: number): void {
    event.stopPropagation();
    this.activeExportMenuRuleId =
      this.activeExportMenuRuleId === ruleId ? null : ruleId;
  }

  @HostListener('document:click')
  closeExportMenu(): void {
    this.activeExportMenuRuleId = null;
  }

  exportRule(event: Event, rule: any, format: ExportFormat = 'yml'): void {
    event.stopPropagation();
    this.activeExportMenuRuleId = null;
    exportRuleFormatted(
      rule.id,
      rule.title || rule.ruleModel?.title || 'rule',
      rule.ruleCode,
      format
    );
  }

  exportSigmaRule(event: Event, rule: any): void {
    this.exportRule(event, rule, 'yml');
  }
}

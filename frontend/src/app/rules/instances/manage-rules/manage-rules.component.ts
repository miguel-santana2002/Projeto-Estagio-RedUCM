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

  isAdmin: boolean = false;

  sortType = 'id';
  sortReverse = false;
  nameSearch: string = '';
  selectDelete: number = 999999;

  rules: any[] = [];

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

  selectedTypes: string[] = [];
  selectedSintaxes: string[] = [];
  selectedLogSources: string[] = [];
  selectedStatus: string[] = [];

  uniqueTypes: string[] = [];
  uniqueSintaxes: string[] = [];
  uniqueLogSources: string[] = [];

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
          ? data.map((rule) => ({
              ...rule,
              status: (rule.status || '').trim(),
            }))
          : [];
        this.startFilters();
        this.rules.sort((a: any, b: any) => this.sortNumeric(a.id, b.id));
      },
      error: (err) => console.error('Erro ao carregar regras:', err),
    });
  }

  startFilters(): void {
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
  }

  isLogSourceSelected(logSource: string): boolean {
    return this.selectedLogSources.includes(logSource);
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

  toggleStatus(status: string): void {
    this.page = 1;
    this.selectedStatus = this.selectedStatus.includes(status)
      ? this.selectedStatus.filter((s) => s !== status)
      : [...this.selectedStatus, status];
  }

  clearAllFilters(): void {
    this.page = 1;
    this.selectedLogSources = [];
    this.selectedTypes = [];
    this.selectedSintaxes = [];
    this.selectedStatus = [];
    this.nameSearch = '';
  }

  onSearchChange(): void {
    this.page = 1;
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
          valA = a.ruleModel?.title || '';
          valB = b.ruleModel?.title || '';
          break;
        case 'logsources':
          valA = this.getRuleLogSources(a).join(', ');
          valB = this.getRuleLogSources(b).join(', ');
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

      const ruleLogs = this.getRuleLogSources(rule);
      const matchesLogSources =
        this.selectedLogSources.length === 0 ||
        ruleLogs.some((log: string) => this.selectedLogSources.includes(log));

      const matchesStatus =
        this.selectedStatus.length === 0 ||
        (rule.status && this.selectedStatus.includes(rule.status));

      return (
        matchesName &&
        matchesType &&
        matchesSyntax &&
        matchesLogSources &&
        matchesStatus
      );
    });
  }

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

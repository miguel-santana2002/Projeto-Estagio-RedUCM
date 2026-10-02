import { CommonModule, DatePipe } from '@angular/common';
import {
  Component,
  ElementRef,
  ViewChild,
  OnInit,
  AfterViewInit,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Modal } from 'flowbite';

import { HeaderComponent } from '../../../layout/header/header.component';
import { TitlebannerComponent } from '../../../layout/titlebanner/titlebanner.component';
import { AuthService } from '../../../services/auth.service';
import { RulesService } from '../../../services/rules.service';

@Component({
  selector: 'app-manage-rule-models',
  standalone: true,
  imports: [
    HeaderComponent,
    TitlebannerComponent,
    CommonModule,
    DatePipe,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './manage-rule-models.component.html',
  styleUrl: './manage-rule-models.component.css',
})
export class ManageRuleModelsComponent implements OnInit, AfterViewInit {
  @ViewChild('modal') modal!: ElementRef<HTMLElement>;
  modalFlowbite!: Modal;

  sortType: string = 'id';
  sortReverse: boolean = false;
  nameSearch: string = '';
  selectDelete: number = 999999;

  ruleModels: any[] = [];

  // Controlo de permissões (Admin / Superuser)
  isAdmin: boolean = false;

  // Paginação
  page: number = 1;
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];

  // Controlo do Painel de Filtros
  showFilters: boolean = false;

  // Filtros selecionados
  selectedSintaxes: string[] = [];
  selectedTypes: string[] = [];
  selectedLogSources: string[] = [];

  // Opções únicas para as pills
  uniqueSintaxes: string[] = [];
  uniqueTypes: string[] = [];
  uniqueLogSources: string[] = [];

  constructor(
    private authService: AuthService,
    private rulesService: RulesService,
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadRuleModels();
  }

  ngAfterViewInit(): void {
    if (this.modal?.nativeElement) {
      this.modalFlowbite = new Modal(this.modal.nativeElement);
    }
  }

  loadUserInfo(): void {
    this.authService.loggedInInfo().subscribe({
      next: (data: any) => {
        // Superuser ou Admin têm privilégios totais; staff/operador fica como false
        this.isAdmin = Boolean(data?.is_superuser || data?.is_admin);
      },
      error: (err) => {
        console.error('Erro ao carregar dados do utilizador:', err);
        this.isAdmin = false;
      },
    });
  }

  loadRuleModels(): void {
    this.rulesService.getRuleModels().subscribe({
      next: (data: any) => {
        this.ruleModels = Array.isArray(data) ? data : [];
        this.startFilters();
        this.ruleModels.sort((a: any, b: any) => this.sortNumeric(a.id, b.id));
      },
      error: (err) => console.error('Erro ao carregar modelos de regra:', err),
    });
  }

  startFilters(): void {
    this.uniqueSintaxes = Array.from(
      new Set(
        this.ruleModels
          .map((item: any) => item.syntax)
          .filter((s): s is string => Boolean(s)),
      ),
    ).sort();

    this.uniqueTypes = Array.from(
      new Set(
        this.ruleModels
          .map((item: any) => item.type)
          .filter((t): t is string => Boolean(t)),
      ),
    ).sort();

    this.uniqueLogSources = Array.from(
      new Set(
        this.ruleModels
          .flatMap((item: any) => item.logsources || [])
          .filter((l): l is string => Boolean(l)),
      ),
    ).sort();
  }

  // Toggles de Filtro com Reset de Página
  toggleType(type: string): void {
    this.page = 1;
    if (this.selectedTypes.includes(type)) {
      this.selectedTypes = this.selectedTypes.filter((t) => t !== type);
    } else {
      this.selectedTypes = [...this.selectedTypes, type];
    }
  }

  isTypeSelected(type: string): boolean {
    return this.selectedTypes.includes(type);
  }

  toggleSyntax(syntax: string): void {
    this.page = 1;
    if (this.selectedSintaxes.includes(syntax)) {
      this.selectedSintaxes = this.selectedSintaxes.filter((s) => s !== syntax);
    } else {
      this.selectedSintaxes = [...this.selectedSintaxes, syntax];
    }
  }

  isSyntaxSelected(syntax: string): boolean {
    return this.selectedSintaxes.includes(syntax);
  }

  toggleLogSource(logSource: string): void {
    this.page = 1;
    if (this.selectedLogSources.includes(logSource)) {
      this.selectedLogSources = this.selectedLogSources.filter(
        (l) => l !== logSource,
      );
    } else {
      this.selectedLogSources = [...this.selectedLogSources, logSource];
    }
  }

  isLogSourceSelected(logSource: string): boolean {
    return this.selectedLogSources.includes(logSource);
  }

  // Ações de Limpeza
  clearSelectedSyntax(): void {
    this.page = 1;
    this.selectedSintaxes = [];
  }

  clearSelectedTypes(): void {
    this.page = 1;
    this.selectedTypes = [];
  }

  clearSelectedLogSources(): void {
    this.page = 1;
    this.selectedLogSources = [];
  }

  clearAllFilters(): void {
    this.page = 1;
    this.selectedSintaxes = [];
    this.selectedTypes = [];
    this.selectedLogSources = [];
    this.nameSearch = '';
  }

  onSearchChange(): void {
    this.page = 1;
  }

  // Filtragem Reativa
  get filteredRuleModels(): any[] {
    const term = this.nameSearch.trim().toLowerCase();

    return this.ruleModels.filter((rule: any) => {
      const matchesName = (rule.title || '').toLowerCase().includes(term);

      const matchesSyntax =
        this.selectedSintaxes.length === 0 ||
        this.selectedSintaxes.includes(rule.syntax);

      const matchesType =
        this.selectedTypes.length === 0 ||
        this.selectedTypes.includes(rule.type);

      const matchesLogs =
        this.selectedLogSources.length === 0 ||
        (rule.logsources || []).some((log: string) =>
          this.selectedLogSources.includes(log),
        );

      return matchesName && matchesSyntax && matchesType && matchesLogs;
    });
  }

  // Segmentação Paginada
  get pagedRuleModels(): any[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredRuleModels.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRuleModels.length / this.pageSize) || 1;
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

  // Ordenação
  sortTable(column: string): void {
    if (this.sortType === column) {
      this.sortReverse = !this.sortReverse;
    } else {
      this.sortType = column;
      this.sortReverse = false;
    }

    this.ruleModels.sort((a: any, b: any) => {
      const valA = a[column];
      const valB = b[column];

      if (valA == null && valB != null) return this.sortReverse ? -1 : 1;
      if (valA != null && valB == null) return this.sortReverse ? 1 : -1;
      if (valA == null && valB == null) return 0;

      if (Array.isArray(valA) && Array.isArray(valB)) {
        return (valA.length - valB.length) * (this.sortReverse ? -1 : 1);
      }

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

  // Gestão de Modal Eliminar
  updateSelectDelete(event: Event, id: number): void {
    if (!this.isAdmin) return;
    event.stopPropagation();
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
    this.rulesService.deleteRuleModelById(this.selectDelete).subscribe({
      next: () => {
        this.loadRuleModels();
        if (this.page > this.totalPages) {
          this.page = this.totalPages;
        }
      },
      error: (err) => console.error('Erro ao eliminar modelo de regra:', err),
    });
  }
}
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { HeaderComponent } from '../../layout/header/header.component';
import { TitlebannerComponent } from '../../layout/titlebanner/titlebanner.component';
import { RulesService } from '../../services/rules.service';
import { AuthService } from '../../services/auth.service';
import { smartMatch, tokenizeQuery } from '../../helper/search-utils';

@Component({
  selector: 'app-manage-logsources',
  standalone: true,
  templateUrl: './manage-logsources.component.html',
  styleUrl: './manage-logsources.component.css',
  imports: [
    HeaderComponent,
    TitlebannerComponent,
    FormsModule,
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
  ],
})
export class ManageLogsourcesComponent implements OnInit {
  isAdmin: boolean = false;
  isLoading: boolean = true;

  logsources: any[] = [];
  filteredLogsources: any[] = [];
  pagedLogsources: any[] = [];

  // Pesquisa
  nameSearch: string = '';

  // Painel de Filtros
  showFilters: boolean = false;
  selectedTypes: string[] = [];
  selectedCollections: string[] = [];

  // Opções e Dicionários
  typeOptions = [
    { value: 'windows', label: 'Windows' },
    { value: 'linux', label: 'Linux' },
    { value: 'network', label: 'Network' },
    { value: 'cloud', label: 'Cloud' },
    { value: 'application', label: 'Application' },
    { value: 'other', label: 'Outro' },
  ];

  collectionOptions = [
    { value: 'agent', label: 'Agent' },
    { value: 'syslog', label: 'Syslog' },
    { value: 'api', label: 'API' },
    { value: 'file', label: 'File' },
    { value: 'other', label: 'Outro' },
  ];

  uniqueTypes: string[] = [];
  uniqueCollections: string[] = [];

  // Ordenação
  sortType: string = 'id';
  sortReverse: boolean = false;

  // Paginação
  page: number = 1;
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];

  // Modal de Criação
  showCreateModal: boolean = false;
  newLog: any = this.emptyLog();
  customType: string = '';
  customCollection: string = '';
  createErrorMessage: string = '';
  isCreating: boolean = false;

  // Modal de Detalhes
  selectedLog: any = null;

  // Modal de Eliminação
  selectDelete: any = null;
  showDeleteModal: boolean = false;

  // Feedback Toast
  toastMessage: string | null = null;
  private toastTimeout: any;

  constructor(
    private rulesService: RulesService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadLogSources();
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

  loadLogSources(): void {
    this.isLoading = true;
    this.rulesService.getRegisteredLogSources().subscribe({
      next: (data: any[]) => {
        this.logsources = Array.isArray(data) ? data : [];
        this.extractUniqueFilters();
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar log sources:', err);
        this.logsources = [];
        this.applyFilters();
        this.isLoading = false;
      },
    });
  }

  private emptyLog() {
    return {
      name: '',
      description: '',
      type: '',
      collectionMethod: '',
    };
  }

  private showToast(msg: string): void {
    this.toastMessage = msg;
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastMessage = null;
    }, 3000);
  }

  typeLabel(value: string): string {
    if (!value) return '';
    const match = this.typeOptions.find(
      (o) => o.value.toLowerCase() === value.toLowerCase(),
    );
    return match ? match.label : value;
  }

  collectionLabel(value: string): string {
    if (!value) return '';
    const match = this.collectionOptions.find(
      (o) => o.value.toLowerCase() === value.toLowerCase(),
    );
    return match ? match.label : value;
  }

  extractUniqueFilters(): void {
    const typesSet = new Set<string>();
    const collectionsSet = new Set<string>();

    this.logsources.forEach((log) => {
      if (log.type && log.type.trim()) {
        typesSet.add(log.type.trim());
      }
      if (log.collectionMethod && log.collectionMethod.trim()) {
        collectionsSet.add(log.collectionMethod.trim());
      }
    });

    this.uniqueTypes = Array.from(typesSet).sort((a, b) => a.localeCompare(b));
    this.uniqueCollections = Array.from(collectionsSet).sort((a, b) =>
      a.localeCompare(b),
    );
  }

  // --- FILTROS E PESQUISA ---

  onSearchChange(): void {
    this.page = 1;
    this.applyFilters();
  }

  toggleType(type: string): void {
    this.page = 1;
    this.selectedTypes = this.selectedTypes.includes(type)
      ? this.selectedTypes.filter((t) => t !== type)
      : [...this.selectedTypes, type];
    this.applyFilters();
  }

  isTypeSelected(type: string): boolean {
    return this.selectedTypes.includes(type);
  }

  toggleCollection(coll: string): void {
    this.page = 1;
    this.selectedCollections = this.selectedCollections.includes(coll)
      ? this.selectedCollections.filter((c) => c !== coll)
      : [...this.selectedCollections, coll];
    this.applyFilters();
  }

  isCollectionSelected(coll: string): boolean {
    return this.selectedCollections.includes(coll);
  }

  clearAllFilters(): void {
    this.page = 1;
    this.nameSearch = '';
    this.selectedTypes = [];
    this.selectedCollections = [];
    this.applyFilters();
  }

  applyFilters(): void {
    const tokens = tokenizeQuery(this.nameSearch);

    this.filteredLogsources = this.logsources.filter((log: any) => {
      const corpus = [
        log.id,
        log.name,
        log.description,
        log.type,
        this.typeLabel(log.type),
        log.collectionMethod,
        this.collectionLabel(log.collectionMethod),
      ];

      const matchesSearch =
        tokens.length === 0 || smartMatch(corpus, this.nameSearch);

      const matchesType =
        this.selectedTypes.length === 0 ||
        (log.type && this.selectedTypes.includes(log.type));

      const matchesCollection =
        this.selectedCollections.length === 0 ||
        (log.collectionMethod &&
          this.selectedCollections.includes(log.collectionMethod));

      return matchesSearch && matchesType && matchesCollection;
    });

    this.updatePagedLogsources();
  }

  // --- ORDENAÇÃO ---

  sortTable(column: string): void {
    if (this.sortType === column) {
      this.sortReverse = !this.sortReverse;
    } else {
      this.sortType = column;
      this.sortReverse = false;
    }

    this.logsources.sort((a: any, b: any) => {
      let valA: any = a[column];
      let valB: any = b[column];

      if (valA == null && valB != null) return this.sortReverse ? -1 : 1;
      if (valA != null && valB == null) return this.sortReverse ? 1 : -1;
      if (valA == null && valB == null) return 0;

      if (typeof valA === 'string') {
        return valA.localeCompare(valB) * (this.sortReverse ? -1 : 1);
      }
      return (Number(valA) - Number(valB)) * (this.sortReverse ? -1 : 1);
    });

    this.applyFilters();
  }

  // --- PAGINAÇÃO ---

  updatePagedLogsources(): void {
    const start = (this.page - 1) * this.pageSize;
    this.pagedLogsources = this.filteredLogsources.slice(
      start,
      start + this.pageSize,
    );
  }

  get totalPages(): number {
    return Math.ceil(this.filteredLogsources.length / this.pageSize) || 1;
  }

  setPage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.page = newPage;
      this.updatePagedLogsources();
    }
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = Number(newSize);
    this.page = 1;
    this.updatePagedLogsources();
  }

  // --- MODAL DE DETALHES ---

  viewDetails(log: any): void {
    this.selectedLog = log;
  }

  closeDetails(): void {
    this.selectedLog = null;
  }

  // --- MODAL DE CRIAÇÃO ---

  openCreateModal(): void {
    this.newLog = this.emptyLog();
    this.customType = '';
    this.customCollection = '';
    this.createErrorMessage = '';
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.createErrorMessage = '';
  }

  createLogSource(): void {
    if (!this.newLog.name?.trim() || !this.newLog.description?.trim()) {
      this.createErrorMessage = 'Preencha todos os campos obrigatórios.';
      return;
    }

    let finalType = this.newLog.type || '';
    if (finalType === 'other') {
      finalType = this.customType.trim() || 'other';
    }

    let finalCollection = this.newLog.collectionMethod || '';
    if (finalCollection === 'other') {
      finalCollection = this.customCollection.trim() || 'other';
    }

    const payload = {
      name: this.newLog.name.trim(),
      description: this.newLog.description.trim(),
      type: finalType,
      collectionMethod: finalCollection,
      products: [],
    };

    this.isCreating = true;
    this.createErrorMessage = '';

    this.rulesService.createRegisteredLogSource(payload).subscribe({
      next: () => {
        this.isCreating = false;
        this.closeCreateModal();
        this.showToast('Log source registada com sucesso!');
        this.loadLogSources();
      },
      error: (error: HttpErrorResponse) => {
        this.isCreating = false;
        if (error.status === 400 && error.error?.error) {
          this.createErrorMessage = error.error.error;
        } else {
          this.createErrorMessage =
            'Ocorreu um erro ao criar a log source. Tente novamente.';
        }
      },
    });
  }

  // --- MODAL DE ELIMINAÇÃO ---

  openDeleteModal(log: any): void {
    if (!this.isAdmin) return;
    this.selectDelete = log;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.selectDelete = null;
    this.showDeleteModal = false;
  }

  deleteLogSource(): void {
    if (!this.isAdmin || !this.selectDelete) return;

    const id = this.selectDelete.id;
    this.rulesService.deleteLogSourceById(id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.showToast('Log source eliminada com sucesso!');
        this.loadLogSources();
      },
      error: (err) => {
        console.error('Erro ao eliminar log source:', err);
        this.closeDeleteModal();
      },
    });
  }
}

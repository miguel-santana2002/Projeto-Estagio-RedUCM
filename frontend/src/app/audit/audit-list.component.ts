import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuditLog } from './audit-log.model';
import { AuditService } from './audit.service';
import { HeaderComponent } from '../layout/header/header.component';
import { TitlebannerComponent } from '../layout/titlebanner/titlebanner.component';
import { normalizeSearchText, tokenizeQuery } from '../helper/search-utils';

@Component({
  selector: 'app-audit-list',
  templateUrl: './audit-list.component.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    HeaderComponent,
    TitlebannerComponent,
  ],
})
export class AuditListComponent implements OnInit {
  logs: AuditLog[] = [];
  filteredLogs: AuditLog[] = [];
  pagedLogs: AuditLog[] = [];
  loading: boolean = false;
  errorMessage: string | null = null;

  // Pesquisa e Ordenação
  searchTerm: string = '';
  sortType: string = 'id';
  sortReverse: boolean = true; // Mais recentes primeiro por omissão

  // Paginação
  page: number = 1;
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];

  // Controlo do Painel de Filtros
  showFilters: boolean = false;

  // Filtros Selecionados
  selectedActions: string[] = [];
  selectedModels: string[] = [];
  selectedActors: string[] = [];

  // Opções Únicas para as Pills
  uniqueActions: string[] = [];
  uniqueModels: string[] = [];
  uniqueActors: string[] = [];

  constructor(private auditService: AuditService) {}

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  loadAuditLogs(): void {
    this.loading = true;
    this.errorMessage = null;

    const actionLabels: Record<string, string> = {
      CREATE: 'Criação Criar Adicionar',
      UPDATE: 'Alteração Editar Modificar Atualização',
      DELETE: 'Remoção Apagar Eliminar Exclusão',
      LOGIN: 'Login Sessão Entrada',
      LOGOUT: 'Logout Saída',
    };

    this.auditService.getAuditLogs().subscribe({
      next: (data) => {
        this.logs = (Array.isArray(data) ? data : []).map((log: any) => {
          const extraAction = actionLabels[log.action] || '';
          const changesStr =
            log.changes && typeof log.changes === 'object'
              ? JSON.stringify(log.changes)
              : String(log.changes || '');

          const corpus = normalizeSearchText([
            log.id,
            `#${log.id}`,
            log.action,
            extraAction,
            log.object_repr,
            log.model_name,
            log.actor || 'Sistema',
            log.timestamp,
            changesStr.length > 500 ? changesStr.substring(0, 500) : changesStr,
          ].join(' '));

          return {
            ...log,
            _actor: log.actor || 'Sistema',
            _searchCorpus: corpus,
          };
        });

        this.startFilters();
        this.sortTable('id');
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar logs de auditoria:', err);
        this.errorMessage =
          'Não foi possível carregar o histórico de auditoria.';
        this.loading = false;
      },
    });
  }

  startFilters(): void {
    this.uniqueActions = Array.from(
      new Set(
        this.logs
          .map((l: any) => l.action)
          .filter((act): act is string => Boolean(act)),
      ),
    ).sort();

    this.uniqueModels = Array.from(
      new Set(
        this.logs
          .map((l: any) => l.model_name)
          .filter((m): m is string => Boolean(m)),
      ),
    ).sort();

    this.uniqueActors = Array.from(
      new Set(
        this.logs
          .map((l: any) => l._actor || l.actor || 'Sistema')
          .filter((a): a is string => Boolean(a)),
      ),
    ).sort();
  }

  // Toggles de Filtro com Reset de Página
  toggleAction(act: string): void {
    this.page = 1;
    if (this.selectedActions.includes(act)) {
      this.selectedActions = this.selectedActions.filter((a) => a !== act);
    } else {
      this.selectedActions = [...this.selectedActions, act];
    }
    this.applyFilters();
  }

  isActionSelected(act: string): boolean {
    return this.selectedActions.includes(act);
  }

  toggleModel(model: string): void {
    this.page = 1;
    if (this.selectedModels.includes(model)) {
      this.selectedModels = this.selectedModels.filter((m) => m !== model);
    } else {
      this.selectedModels = [...this.selectedModels, model];
    }
    this.applyFilters();
  }

  isModelSelected(model: string): boolean {
    return this.selectedModels.includes(model);
  }

  toggleActor(actor: string): void {
    this.page = 1;
    if (this.selectedActors.includes(actor)) {
      this.selectedActors = this.selectedActors.filter((a) => a !== actor);
    } else {
      this.selectedActors = [...this.selectedActors, actor];
    }
    this.applyFilters();
  }

  isActorSelected(actor: string): boolean {
    return this.selectedActors.includes(actor);
  }

  clearAllFilters(): void {
    this.page = 1;
    this.selectedActions = [];
    this.selectedModels = [];
    this.selectedActors = [];
    this.searchTerm = '';
    this.applyFilters();
  }

  onSearchChange(): void {
    this.page = 1;
    this.applyFilters();
  }

  applyFilters(): void {
    const tokens = tokenizeQuery(this.searchTerm);

    this.filteredLogs = this.logs.filter((log: any) => {
      const matchesSearch =
        tokens.length === 0 || tokens.every((token) => log._searchCorpus.includes(token));

      const matchesAction =
        this.selectedActions.length === 0 ||
        this.selectedActions.includes(log.action);

      const matchesModel =
        this.selectedModels.length === 0 ||
        this.selectedModels.includes(log.model_name);

      const actorName = log._actor || log.actor || 'Sistema';
      const matchesActor =
        this.selectedActors.length === 0 ||
        this.selectedActors.includes(actorName);

      return matchesSearch && matchesAction && matchesModel && matchesActor;
    });

    this.updatePagedLogs();
  }

  updatePagedLogs(): void {
    const start = (this.page - 1) * this.pageSize;
    this.pagedLogs = this.filteredLogs.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredLogs.length / this.pageSize) || 1;
  }

  setPage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.page = newPage;
      this.updatePagedLogs();
    }
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = Number(newSize);
    this.page = 1;
    this.updatePagedLogs();
  }

  // Ordenação
  sortTable(column: string): void {
    if (this.sortType === column) {
      this.sortReverse = !this.sortReverse;
    } else {
      this.sortType = column;
      this.sortReverse = false;
    }

    this.logs.sort((a: any, b: any) => {
      let valA = a[column];
      let valB = b[column];

      if (column === 'actor') {
        valA = a.actor || 'Sistema';
        valB = b.actor || 'Sistema';
      }

      if (column === 'timestamp') {
        const timeA = new Date(valA).getTime();
        const timeB = new Date(valB).getTime();
        return (timeA - timeB) * (this.sortReverse ? -1 : 1);
      }

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
}

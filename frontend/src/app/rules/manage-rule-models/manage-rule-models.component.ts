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

import { HeaderComponent } from '../../layout/header/header.component';
import { TitlebannerComponent } from '../../layout/titlebanner/titlebanner.component';
import { AuthService } from '../../services/auth.service';
import { RulesService } from '../../services/rules.service';

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
    this.loadRuleModels();
  }

  ngAfterViewInit(): void {
    if (this.modal?.nativeElement) {
      this.modalFlowbite = new Modal(this.modal.nativeElement);
    }
  }

  loadRuleModels(): void {
    this.rulesService.getRuleModels().subscribe({
      next: (data: any) => {
        this.ruleModels = Array.isArray(data) ? data : [];
        this.startFilters();
      },
      error: (err) => console.error('Erro ao carregar modelos de regra:', err),
    });
  }

  startFilters(): void {
    this.uniqueSintaxes = [
      ...new Set(
        this.ruleModels
          .map((item: any) => item.syntax)
          .filter((s): s is string => Boolean(s)),
      ),
    ].sort();

    this.uniqueTypes = [
      ...new Set(
        this.ruleModels
          .map((item: any) => item.type)
          .filter((t): t is string => Boolean(t)),
      ),
    ].sort();

    this.uniqueLogSources = Array.from(
      new Set(
        this.ruleModels
          .flatMap((item: any) => item.logsources || [])
          .filter((l): l is string => Boolean(l)),
      ),
    ).sort();
  }

  // Toggles de Seleção (Pills)
  toggleType(type: string): void {
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
    this.selectedSintaxes = [];
  }

  clearSelectedTypes(): void {
    this.selectedTypes = [];
  }

  clearSelectedLogSources(): void {
    this.selectedLogSources = [];
  }

  clearAllFilters(): void {
    this.selectedSintaxes = [];
    this.selectedTypes = [];
    this.selectedLogSources = [];
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

      if (!valA && valB) return this.sortReverse ? -1 : 1;
      if (valA && !valB) return this.sortReverse ? 1 : -1;
      if (!valA && !valB) return 0;

      if (Array.isArray(valA) && Array.isArray(valB)) {
        return (valA.length - valB.length) * (this.sortReverse ? -1 : 1);
      }

      if (typeof valA === 'string') {
        return valA.localeCompare(valB) * (this.sortReverse ? -1 : 1);
      }

      return (Number(valA) - Number(valB)) * (this.sortReverse ? -1 : 1);
    });
  }

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

  // Gestão de Modal Eliminar
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
    this.rulesService.deleteRuleModelById(this.selectDelete).subscribe({
      next: () => {
        this.loadRuleModels();
      },
      error: (err) => console.error('Erro ao eliminar modelo de regra:', err),
    });
  }
}

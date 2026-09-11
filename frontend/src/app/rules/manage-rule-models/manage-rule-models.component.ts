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

  sortType = 'id';
  sortReverse = false;
  nameSearch: string = '';
  selectDelete: number = 999999;

  ruleModels: any[] = [];

  // Filtros selecionados
  selectedSintaxes: string[] = [];
  selectedTypes: string[] = [];
  selectedLogSources: string[] = [];

  // Opções únicas para as dropdowns do Drawer
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
    // Extrai valores únicos ignorando nulos/vazios
    this.uniqueSintaxes = [
      ...new Set(
        this.ruleModels
          .map((item: any) => item.syntax)
          .filter((s): s is string => Boolean(s)),
      ),
    ];

    this.uniqueTypes = [
      ...new Set(
        this.ruleModels
          .map((item: any) => item.type)
          .filter((t): t is string => Boolean(t)),
      ),
    ];

    this.uniqueLogSources = Array.from(
      new Set(
        this.ruleModels
          .flatMap((item: any) => item.logsources || [])
          .filter((l): l is string => Boolean(l)),
      ),
    );
  }

  // Ordenação com suporte para Strings, Números, Arrays e Valores Nulos
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

      // 1. Trata campos vazios/nulos
      if (!valA && valB) return this.sortReverse ? -1 : 1;
      if (valA && !valB) return this.sortReverse ? 1 : -1;
      if (!valA && !valB) return 0;

      // 2. Trata arrays (Logsources) ordenando pela quantidade
      if (Array.isArray(valA) && Array.isArray(valB)) {
        return (valA.length - valB.length) * (this.sortReverse ? -1 : 1);
      }

      // 3. Trata strings
      if (typeof valA === 'string') {
        return valA.localeCompare(valB) * (this.sortReverse ? -1 : 1);
      }

      // 4. Trata números (IDs)
      return (Number(valA) - Number(valB)) * (this.sortReverse ? -1 : 1);
    });
  }

  get filteredRuleModels(): any[] {
    return this.ruleModels.filter((rule: any) => {
      // 1. Filtro por nome
      const matchesName = (rule.title || '')
        .toLowerCase()
        .includes(this.nameSearch.toLowerCase());

      // 2. Filtro por Sintaxe
      const matchesSyntax =
        this.selectedSintaxes.length === 0 ||
        this.selectedSintaxes.includes(rule.syntax);

      // 3. Filtro por Tipo
      const matchesType =
        this.selectedTypes.length === 0 ||
        this.selectedTypes.includes(rule.type);

      // 4. Filtro por Logsources
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

  // Ações de Limpeza de Filtros
  clearSelectedSyntax(): void {
    this.selectedSintaxes = [];
  }

  clearSelectedTypes(): void {
    this.selectedTypes = [];
  }

  clearSelectedLogSources(): void {
    this.selectedLogSources = [];
  }

  clearFilters(): void {
    this.selectedSintaxes = [];
    this.selectedTypes = [];
    this.selectedLogSources = [];
    this.nameSearch = '';
  }
}

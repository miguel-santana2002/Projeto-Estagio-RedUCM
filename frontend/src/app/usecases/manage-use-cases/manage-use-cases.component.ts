import {
  Component,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Modal } from 'flowbite';

import { AuthService } from '../../services/auth.service';
import { UsecasesService } from '../../services/usecases.service';
import { TitlebannerComponent } from '../../layout/titlebanner/titlebanner.component';
import { HeaderComponent } from '../../layout/header/header.component';

@Component({
  selector: 'app-manage-use-cases',
  standalone: true,
  templateUrl: './manage-use-cases.component.html',
  styleUrl: './manage-use-cases.component.css',
  imports: [
    TitlebannerComponent,
    HeaderComponent,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    RouterModule,
  ],
})
export class ManageUseCasesComponent implements OnInit, AfterViewInit {
  @ViewChild('modal') modal!: ElementRef<HTMLElement>;
  modalFlowbite!: Modal;

  useCases: any[] = [];
  user: any = { username: '', companies: [] };

  sortType: string = 'id';
  sortReverse: boolean = false;
  nameSearch: string = '';
  selectDelete: number = 999999;

  // Controlo do Painel de Filtros
  showFilters: boolean = false;

  // Filtros
  selectedMitreTechniques: string[] = [];
  selectedCNCSClass: string[] = [];
  uniqueMitreTechniques: string[] = [];
  uniqueCNCSClasses: string[] = [];

  constructor(
    private useCasesService: UsecasesService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadUseCases();
    this.loadUserInfo();
  }

  ngAfterViewInit(): void {
    if (this.modal?.nativeElement) {
      this.modalFlowbite = new Modal(this.modal.nativeElement);
    }
  }

  loadUseCases(): void {
    this.useCasesService.getUseCases().subscribe({
      next: (data: any) => {
        this.useCases = Array.isArray(data) ? data : [];
        this.startFilters();
        this.useCases.sort((a: any, b: any) => this.sortNumeric(a.id, b.id));
      },
      error: (err) => console.error('Erro ao carregar use cases:', err),
    });
  }

  loadUserInfo(): void {
    this.authService.loggedInInfo().subscribe({
      next: (data: any) => {
        this.user = data || { username: '', companies: [] };
        if (this.user.companies === null) {
          this.user.companies = [];
        }
      },
      error: (err) =>
        console.error('Erro ao carregar dados de utilizador:', err),
    });
  }

  startFilters(): void {
    // Extrai classes CNCS únicas e válidas
    this.uniqueCNCSClasses = Array.from(
      new Set(
        this.useCases
          .map((u: any) => u.cncsClass)
          .filter((c: any) => Boolean(c)),
      ),
    ).sort();

    // Extrai técnicas MITRE únicas e válidas
    const mitreSet = new Set<string>();
    this.useCases.forEach((u: any) => {
      if (Array.isArray(u.mitreTechniques)) {
        u.mitreTechniques.forEach((tech: string) => {
          if (tech) mitreSet.add(tech);
        });
      }
    });
    this.uniqueMitreTechniques = Array.from(mitreSet).sort();
  }

  // Métodos Pills: Técnicas MITRE
  toggleMitreTechnique(technique: string): void {
    if (this.selectedMitreTechniques.includes(technique)) {
      this.selectedMitreTechniques = this.selectedMitreTechniques.filter(
        (t) => t !== technique,
      );
    } else {
      this.selectedMitreTechniques = [
        ...this.selectedMitreTechniques,
        technique,
      ];
    }
  }

  isMitreTechniqueSelected(technique: string): boolean {
    return this.selectedMitreTechniques.includes(technique);
  }

  // Métodos Pills: Classes CNCS
  toggleCNCSClass(cncs: string): void {
    if (this.selectedCNCSClass.includes(cncs)) {
      this.selectedCNCSClass = this.selectedCNCSClass.filter((c) => c !== cncs);
    } else {
      this.selectedCNCSClass = [...this.selectedCNCSClass, cncs];
    }
  }

  isCNCSClassSelected(cncs: string): boolean {
    return this.selectedCNCSClass.includes(cncs);
  }

  // Limpeza de Filtros
  clearMitreTechniques(): void {
    this.selectedMitreTechniques = [];
  }

  clearCNCSClass(): void {
    this.selectedCNCSClass = [];
  }

  clearAllFilters(): void {
    this.selectedMitreTechniques = [];
    this.selectedCNCSClass = [];
  }

  // Ordenação
  sortTable(column: string): void {
    if (this.sortType === column) {
      this.sortReverse = !this.sortReverse;
    } else {
      this.sortType = column;
      this.sortReverse = false;
    }

    this.useCases.sort((a: any, b: any) => {
      const valueA = a[column];
      const valueB = b[column];

      if (valueA == null && valueB != null) return this.sortReverse ? -1 : 1;
      if (valueA != null && valueB == null) return this.sortReverse ? 1 : -1;
      if (valueA == null && valueB == null) return 0;

      if (typeof valueA === 'string') {
        return this.sortString(valueA, valueB);
      }
      return this.sortNumeric(valueA, valueB);
    });
  }

  private sortString(a: string = '', b: string = ''): number {
    return a.localeCompare(b) * (this.sortReverse ? -1 : 1);
  }

  private sortNumeric(a: number = 0, b: number = 0): number {
    return (a - b) * (this.sortReverse ? -1 : 1);
  }

  // Filtragem Reativa
  get filteredUseCases(): any[] {
    const term = this.nameSearch.trim().toLowerCase();

    return this.useCases.filter((u: any) => {
      // 1. Pesquisa por Nome
      const matchesSearch =
        !term || (u.title && u.title.toLowerCase().includes(term));

      // 2. Filtro por Técnicas MITRE
      const matchesMitre =
        this.selectedMitreTechniques.length === 0 ||
        (Array.isArray(u.mitreTechniques) &&
          this.selectedMitreTechniques.some((tech: string) =>
            u.mitreTechniques.includes(tech),
          ));

      // 3. Filtro por Classe CNCS
      const matchesCNCS =
        this.selectedCNCSClass.length === 0 ||
        this.selectedCNCSClass.includes(u.cncsClass);

      return matchesSearch && matchesMitre && matchesCNCS;
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

  deleteUseCase(): void {
    this.useCasesService.deleteUseCase(this.selectDelete).subscribe({
      next: () => {
        this.useCases = this.useCases.filter(
          (u: any) => u.id !== this.selectDelete,
        );
      },
      error: (err) => console.error('Erro ao eliminar use case:', err),
    });
  }
}

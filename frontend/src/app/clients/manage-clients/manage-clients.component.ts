import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TagInputModule } from 'ngx-chips';

import { HeaderComponent } from '../../layout/header/header.component';
import { TitlebannerComponent } from '../../layout/titlebanner/titlebanner.component';
import { AuthService } from '../../services/auth.service';
import { RulesService } from '../../services/rules.service';

@Component({
  selector: 'app-manage-clients',
  standalone: true,
  templateUrl: './manage-clients.component.html',
  styleUrl: './manage-clients.component.css',
  imports: [
    TitlebannerComponent,
    HeaderComponent,
    FormsModule,
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TagInputModule,
  ],
})
export class ManageClientsComponent implements OnInit {
  @ViewChild('modal') modal!: ElementRef;

  sortType = 'name';
  sortReverse = false;
  nameSearch: string = '';
  selectDelete: number = 9999999;
  errorMessage: string = '';
  clients: any[] = [];
  registeredLogsources: string[] = [];

  // Paginação
  page: number = 1;
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];

  // Filtros
  showFilters: boolean = false;
  selectedLogsources: string[] = [];
  uniqueLogsources: string[] = [];

  // Modais
  isCreateModalOpen: boolean = false;
  selectedClient: any = null;
  isDetailsModalOpen: boolean = false;

  createClientForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    logsources: new FormControl(null, [Validators.required]),
  });

  get name() {
    return this.createClientForm.get('name');
  }

  constructor(
    private authService: AuthService,
    private rulesService: RulesService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadClients();
    this.loadRegisteredLogSources();
  }

  loadClients(): void {
    this.authService.getClients().subscribe({
      next: (data: any) => {
        this.clients = Array.isArray(data) ? data : [];
        this.startFilters();
      },
      error: (err) => console.error('Erro ao carregar clientes:', err),
    });
  }

  loadRegisteredLogSources(): void {
    this.rulesService.getRegisteredLogSources().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          this.registeredLogsources = data.map((ls: any) => ls.name);
        }
      },
      error: (err) => console.error('Erro ao carregar logsources:', err),
    });
  }

  startFilters(): void {
    this.uniqueLogsources = Array.from(
      new Set(
        this.clients
          .flatMap((c: any) => c.logsources || [])
          .filter((l: string): l is string => Boolean(l)),
      ),
    ).sort();
  }

  // Toggles de Filtro
  toggleLogsource(log: string): void {
    this.page = 1;
    if (this.selectedLogsources.includes(log)) {
      this.selectedLogsources = this.selectedLogsources.filter(
        (l) => l !== log,
      );
    } else {
      this.selectedLogsources = [...this.selectedLogsources, log];
    }
  }

  isLogsourceSelected(log: string): boolean {
    return this.selectedLogsources.includes(log);
  }

  clearAllFilters(): void {
    this.page = 1;
    this.selectedLogsources = [];
  }

  onSearchChange(): void {
    this.page = 1;
  }

  // Filtragem Reativa
  get filteredClients(): any[] {
    const term = this.nameSearch.trim().toLowerCase();

    return this.clients.filter((c: any) => {
      const matchesName =
        !term || (c.name && c.name.toLowerCase().includes(term));
      const matchesLogs =
        this.selectedLogsources.length === 0 ||
        (Array.isArray(c.logsources) &&
          c.logsources.some((log: string) =>
            this.selectedLogsources.includes(log),
          ));

      return matchesName && matchesLogs;
    });
  }

  // Segmentação Paginada (Dados que a tabela efetivamente renderiza)
  get pagedClients(): any[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredClients.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredClients.length / this.pageSize) || 1;
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

    this.clients.sort((a: any, b: any) => {
      const valueA = a[column];
      const valueB = b[column];

      if (valueA == null && valueB != null) return this.sortReverse ? -1 : 1;
      if (valueA != null && valueB == null) return this.sortReverse ? 1 : -1;
      if (valueA == null && valueB == null) return 0;

      if (Array.isArray(valueA) && Array.isArray(valueB)) {
        return (valueA.length - valueB.length) * (this.sortReverse ? -1 : 1);
      } else if (typeof valueA === 'string') {
        return valueA.localeCompare(valueB) * (this.sortReverse ? -1 : 1);
      } else {
        return (Number(valueA) - Number(valueB)) * (this.sortReverse ? -1 : 1);
      }
    });
  }

  // Modais
  openModal(): void {
    this.modal.nativeElement.classList.remove('hidden');
    this.modal.nativeElement.classList.add('flex');
  }

  closeModal(): void {
    this.modal.nativeElement.classList.add('hidden');
    this.modal.nativeElement.classList.remove('flex');
  }

  openCreateModal(): void {
    this.isCreateModalOpen = true;
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
    this.errorMessage = '';
    if (this.createClientForm) {
      this.createClientForm.reset();
    }
  }

  openDetailsModal(client: any): void {
    this.selectedClient = client;
    this.isDetailsModalOpen = true;
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen = false;
    this.selectedClient = null;
  }

  editClient(client: any): void {
    this.closeDetailsModal();
    this.router.navigate(['/edit-client', client.pk]);
  }

  createClient(): void {
    this.errorMessage = '';
    const logsourcesArray: any = this.createClientForm.get('logsources')?.value;
    const logsources = Array.isArray(logsourcesArray)
      ? logsourcesArray.map(
          (ls: any) => ls?.value || ls?.id || ls?.display || ls,
        )
      : [];

    const clientData = {
      name: this.name!.value!,
      logsources: logsources,
    };

    this.authService.createClient(clientData).subscribe({
      next: () => {
        this.loadClients();
        this.createClientForm.reset();
        this.closeCreateModal();
      },
      error: (err: any) => {
        this.errorMessage =
          err.error?.error || 'Erro ao comunicar com o servidor.';
      },
    });
  }

  deleteClient(): void {
    this.authService.deleteCompany(this.selectDelete).subscribe({
      next: () => {
        this.loadClients();
      },
      error: (err) => {
        console.error('Erro ao apagar o cliente:', err);
        alert('Erro ao apagar.');
      },
    });
  }

  updateSelectDelete(id: number): void {
    this.selectDelete = id;
  }
}

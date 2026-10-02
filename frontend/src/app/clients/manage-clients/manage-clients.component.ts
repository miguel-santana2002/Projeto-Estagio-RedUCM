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
  
  // Controlo de operador e admin
  isOperator: boolean = false;
  isAdmin: boolean = true;
  userCompanies: any[] = []; // Guarda as empresas/clientes associados ao utilizador logado

  // Paginação
  page: number = 1;
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];

  // Filtros
  showFilters: boolean = false;
  selectedLogsources: string[] = [];
  uniqueLogsources: string[] = [];

  selectedSiems: string[] = [];
  uniqueSiems: string[] = [];

  // Modais
  isCreateModalOpen: boolean = false;
  selectedClient: any = null;
  isDetailsModalOpen: boolean = false;

  createClientForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    siem: new FormControl('', [Validators.required]),
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
    this.checkUserRole();
    this.loadRegisteredLogSources();
  }

  checkUserRole(): void {
    this.authService.loggedInInfo().subscribe({
      next: (res: any) => {
        if (res) {
          if (res.is_admin !== undefined) {
            this.isAdmin = Boolean(res.is_admin);
            this.isOperator = !this.isAdmin;
          }
          // Recolhe as empresas associadas ao utilizador (podem vir como IDs ou nomes/objetos)
          this.userCompanies = res.companies || res.company_ids || [];
        }
        this.loadClients();
      },
      error: (err) => {
        console.error('Erro ao verificar permissões do utilizador:', err);
        this.loadClients();
      }
    });
  }

  loadClients(): void {
    this.authService.getClients().subscribe({
      next: (data: any) => {
        const allClients = Array.isArray(data) ? data : [];
        
        // Se for operador, filtra apenas os clientes associados na sessão
        if (this.isOperator) {
          this.clients = allClients.filter((client: any) => {
            return this.userCompanies.some((uc: any) => {
              // Compara por ID (pk/id) ou por Nome consoante o que a API devolver em user.companies
              if (typeof uc === 'object' && uc !== null) {
                return uc.pk === client.pk || uc.id === client.pk || uc.name === client.name;
              }
              return uc === client.pk || uc === client.name;
            });
          });
        } else {
          // Admin vê tudo
          this.clients = allClients;
        }

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

    this.uniqueSiems = Array.from(
      new Set(
        this.clients
          .map((c: any) => c.siem)
          .filter((s: string): s is string => Boolean(s)),
      ),
    ).sort();
  }

  toggleLogsource(log: string): void {
    this.page = 1;
    if (this.selectedLogsources.includes(log)) {
      this.selectedLogsources = this.selectedLogsources.filter((l) => l !== log);
    } else {
      this.selectedLogsources = [...this.selectedLogsources, log];
    }
  }

  isLogsourceSelected(log: string): boolean {
    return this.selectedLogsources.includes(log);
  }

  toggleSiem(siem: string): void {
    this.page = 1;
    if (this.selectedSiems.includes(siem)) {
      this.selectedSiems = this.selectedSiems.filter((s) => s !== siem);
    } else {
      this.selectedSiems = [...this.selectedSiems, siem];
    }
  }

  isSiemSelected(siem: string): boolean {
    return this.selectedSiems.includes(siem);
  }

  clearAllFilters(): void {
    this.page = 1;
    this.selectedLogsources = [];
    this.selectedSiems = [];
  }

  onSearchChange(): void {
    this.page = 1;
  }

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
      const matchesSiem =
        this.selectedSiems.length === 0 ||
        (c.siem && this.selectedSiems.includes(c.siem));

      return matchesName && matchesLogs && matchesSiem;
    });
  }

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

  openModal(): void {
    if (!this.isAdmin) return;
    this.modal.nativeElement.classList.remove('hidden');
    this.modal.nativeElement.classList.add('flex');
  }

  closeModal(): void {
    this.modal.nativeElement.classList.add('hidden');
    this.modal.nativeElement.classList.remove('flex');
  }

  openCreateModal(): void {
    if (!this.isAdmin) return;
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
    if (!this.isAdmin) return;
    this.closeDetailsModal();
    this.router.navigate(['/edit-client', client.pk]);
  }

  createClient(): void {
    if (!this.isAdmin) return;
    this.errorMessage = '';
    const logsourcesArray: any = this.createClientForm.get('logsources')?.value;
    const logsources = Array.isArray(logsourcesArray)
      ? logsourcesArray.map(
          (ls: any) => ls?.value || ls?.id || ls?.display || ls,
        )
      : [];

    const clientData = {
      name: this.name!.value!,
      siem: this.createClientForm.get('siem')?.value,
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
    if (!this.isAdmin) return;
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
    if (!this.isAdmin) return;
    this.selectDelete = id;
  }
}
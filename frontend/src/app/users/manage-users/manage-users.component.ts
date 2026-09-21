import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Modal } from 'flowbite';

import { HeaderComponent } from '../../layout/header/header.component';
import { TitlebannerComponent } from '../../layout/titlebanner/titlebanner.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-manage-users',
  standalone: true,
  templateUrl: './manage-users.component.html',
  styleUrl: './manage-users.component.css',
  imports: [
    HeaderComponent,
    FormsModule,
    CommonModule,
    DatePipe,
    TitlebannerComponent,
    RouterModule,
  ],
})
export class ManageUsersComponent implements OnInit, AfterViewInit {
  @ViewChild('modal') modal!: ElementRef<HTMLElement>;
  @ViewChild('modalDetails') modalDetails!: ElementRef<HTMLElement>;

  modalFlowbite!: Modal;
  modalDetailsFlowbite!: Modal;

  users: any[] = [];
  selectedUser: any = null;

  sortType: string = 'pk';
  sortReverse: boolean = false;
  nameSearch: string = '';
  selectDelete: number = 999999;

  showAllCompanies: boolean = false;
  showCompanies: { [key: number]: boolean } = {};

  // Controlo do Painel de Filtros
  showFilters: boolean = false;

  // Filtros
  uniqueClients: string[] = [];
  roles: string[] = ['Administrador', 'Operador'];
  selectedClients: string[] = [];
  selectedRoles: string[] = [];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    if (this.modal?.nativeElement) {
      this.modalFlowbite = new Modal(this.modal.nativeElement);
    }
    if (this.modalDetails?.nativeElement) {
      this.modalDetailsFlowbite = new Modal(this.modalDetails.nativeElement);
    }
  }

  loadUsers(): void {
    this.authService.getUsers().subscribe({
      next: (data: any) => {
        this.users = Array.isArray(data) ? data : [];
        this.users.forEach((user: any) => {
          if (!user.companies) {
            user.companies = [];
          }
        });

        this.startFilters();
        this.sortReverse = false;
        this.users.sort((a: any, b: any) => this.sortNumeric(a.pk, b.pk));
      },
      error: (err) => console.error('Erro ao carregar utilizadores:', err),
    });
  }

  startFilters(): void {
    this.uniqueClients = Array.from(
      new Set(
        this.users
          .flatMap((item: any) => item.companies || [])
          .filter((c: any) => Boolean(c)),
      ),
    );
  }

  // Ordenação
  sortTable(column: string): void {
    if (this.sortType === column) {
      this.sortReverse = !this.sortReverse;
    } else {
      this.sortType = column;
      this.sortReverse = false;
    }

    this.users.sort((a: any, b: any) => {
      let valueA = a[column];
      let valueB = b[column];

      // 1. Trata a coluna 'company' (com base no primeiro cliente associado)
      if (column === 'company') {
        valueA = a.companies?.[0] || '';
        valueB = b.companies?.[0] || '';
      }

      // 2. Trata a coluna 'role' (Administrador vs Operador)
      if (column === 'role') {
        valueA =
          a.companies && a.companies.length > 0 ? 'Operador' : 'Administrador';
        valueB =
          b.companies && b.companies.length > 0 ? 'Operador' : 'Administrador';
      }

      // 3. Trata nulos / indefinidos
      if (valueA == null && valueB != null) return this.sortReverse ? -1 : 1;
      if (valueA != null && valueB == null) return this.sortReverse ? 1 : -1;
      if (valueA == null && valueB == null) return 0;

      // 4. Ordenação String vs Numérica
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
  get filteredUsers(): any[] {
    const term = this.nameSearch.trim().toLowerCase();

    return this.users.filter((user: any) => {
      // 1. Pesquisa por Nome de Utilizador ou Email
      const matchesSearch =
        !term ||
        (user.username && user.username.toLowerCase().includes(term)) ||
        (user.email && user.email.toLowerCase().includes(term));

      // 2. Filtro por Clientes Atribuídos
      const matchesClients =
        this.selectedClients.length === 0 ||
        (user.companies &&
          user.companies.some((c: string) => this.selectedClients.includes(c)));

      // 3. Filtro por Role (Operador tem clientes, Administrador não tem)
      let matchesRole = true;
      const hasCompanies = user.companies && user.companies.length > 0;

      if (
        this.selectedRoles.length > 0 &&
        !(
          this.selectedRoles.includes('Operador') &&
          this.selectedRoles.includes('Administrador')
        )
      ) {
        if (this.selectedRoles.includes('Operador')) {
          matchesRole = hasCompanies;
        } else if (this.selectedRoles.includes('Administrador')) {
          matchesRole = !hasCompanies;
        }
      }

      return matchesSearch && matchesClients && matchesRole;
    });
  }

  toggleClient(client: string): void {
    if (this.selectedClients.includes(client)) {
      this.selectedClients = this.selectedClients.filter((c) => c !== client);
    } else {
      this.selectedClients = [...this.selectedClients, client];
    }
  }

  isClientSelected(client: string): boolean {
    return this.selectedClients.includes(client);
  }

  toggleRole(role: string): void {
    if (this.selectedRoles.includes(role)) {
      this.selectedRoles = this.selectedRoles.filter((r) => r !== role);
    } else {
      this.selectedRoles = [...this.selectedRoles, role];
    }
  }

  isRoleSelected(role: string): boolean {
    return this.selectedRoles.includes(role);
  }

  // Modal Eliminar
  updateSelectDelete(id: number): void {
    this.selectDelete = id;
  }

  openModal(): void {
    this.modalFlowbite?.show();
  }

  closeModal(): void {
    this.modalFlowbite?.hide();
  }

  deleteUser(): void {
    this.authService.deleteUser(this.selectDelete).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (err) => console.error('Erro ao eliminar utilizador:', err),
    });
  }

  // Modal Detalhes
  openModalDetails(user: any): void {
    this.selectedUser = user;
    this.modalDetailsFlowbite?.show();
  }

  closeModalDetails(): void {
    this.modalDetailsFlowbite?.hide();
  }

  toggleCompanies(): void {
    this.showAllCompanies = !this.showAllCompanies;
  }

  // Limpeza de Filtros
  clearSelectedClients(): void {
    this.selectedClients = [];
  }

  clearSelectedRoles(): void {
    this.selectedRoles = [];
  }

  clearAllFilters(): void {
    this.selectedClients = [];
    this.selectedRoles = [];
  }
}

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
import { smartMatch } from '../../helper/search-utils';

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

  // Paginação
  page: number = 1;
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];

  // Controlo do Painel de Filtros
  showFilters: boolean = false;

  // Filtros
  uniqueClients: string[] = [];
  roles: string[] = ['Administrador', 'Operador'];
  selectedClients: string[] = [];
  selectedRoles: string[] = [];

  // Flag para controlo do reset manual de TOTP e estado de bloqueio
  forceTotpReset: boolean = false;
  isUserBlocked: boolean = false;
  isUpdatingTotp: boolean = false;
  isUpdatingBlockStatus: boolean = false;

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
          .filter((c: any): c is string => Boolean(c)),
      ),
    ).sort();
  }

  // Toggles de Filtro com Reset de Página
  toggleClient(client: string): void {
    this.page = 1;
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
    this.page = 1;
    if (this.selectedRoles.includes(role)) {
      this.selectedRoles = this.selectedRoles.filter((r) => r !== role);
    } else {
      this.selectedRoles = [...this.selectedRoles, role];
    }
  }

  isRoleSelected(role: string): boolean {
    return this.selectedRoles.includes(role);
  }

  clearSelectedClients(): void {
    this.page = 1;
    this.selectedClients = [];
  }

  clearSelectedRoles(): void {
    this.page = 1;
    this.selectedRoles = [];
  }

  clearAllFilters(): void {
    this.page = 1;
    this.selectedClients = [];
    this.selectedRoles = [];
  }

  onSearchChange(): void {
    this.page = 1;
  }

  // Filtragem Reativa Completa
  get filteredUsers(): any[] {
    return this.users.filter((user: any) => {
      const userCompanies = Array.isArray(user.companies)
        ? user.companies.join(' ')
        : '';
      const isAdminUser = Boolean(user.is_superuser || user.is_admin);
      const roleLabel = isAdminUser
        ? 'Administrador Admin Superuser'
        : 'Operador Operator';
      const statusLabel = user.is_active
        ? 'Ativo Active'
        : 'Bloqueado Inativo Inactive';

      // 1. Pesquisa Inteligente Multi-campo
      const matchesSearch = smartMatch(
        [
          user.pk,
          user.id,
          user.username,
          user.email,
          roleLabel,
          statusLabel,
          userCompanies,
          user.otpMethod,
        ],
        this.nameSearch
      );

      // 2. Filtro por Clientes Atribuídos
      const matchesClients =
        this.selectedClients.length === 0 ||
        (user.companies &&
          user.companies.some((c: string) => this.selectedClients.includes(c)));

      // 3. Filtro por Role real (Flags booleanas da API)
      let matchesRole = true;

      if (
        this.selectedRoles.length > 0 &&
        !(
          this.selectedRoles.includes('Operador') &&
          this.selectedRoles.includes('Administrador')
        )
      ) {
        if (this.selectedRoles.includes('Operador')) {
          matchesRole = !isAdminUser;
        } else if (this.selectedRoles.includes('Administrador')) {
          matchesRole = isAdminUser;
        }
      }

      return matchesSearch && matchesClients && matchesRole;
    });
  }

  // Segmentação Paginada
  get pagedUsers(): any[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredUsers.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredUsers.length / this.pageSize) || 1;
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

    this.users.sort((a: any, b: any) => {
      let valueA = a[column];
      let valueB = b[column];

      if (column === 'company') {
        valueA = a.companies?.[0] || '';
        valueB = b.companies?.[0] || '';
      }

      if (column === 'role') {
        valueA = a.is_superuser || a.is_admin ? 'Administrador' : 'Operador';
        valueB = b.is_superuser || b.is_admin ? 'Administrador' : 'Operador';
      }

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
    this.forceTotpReset = Boolean(user.showTotp);
    this.isUserBlocked = user.is_active === false;
    this.modalDetailsFlowbite?.show();
  }

  closeModalDetails(): void {
    this.modalDetailsFlowbite?.hide();
  }

  toggleCompanies(): void {
    this.showAllCompanies = !this.showAllCompanies;
  }

  // Controlo do botão de forçar QR Code
  toggleResetTotp(): void {
    if (!this.selectedUser || this.isUpdatingTotp) return;

    this.isUpdatingTotp = true;
    const newForceState = !this.forceTotpReset;

    this.authService.resetTotp(this.selectedUser.pk, newForceState).subscribe({
      next: (res: any) => {
        this.forceTotpReset = Boolean(res.showTotp);
        this.selectedUser.showTotp = this.forceTotpReset;

        const foundUser = this.users.find((u) => u.pk === this.selectedUser.pk);
        if (foundUser) {
          foundUser.showTotp = this.forceTotpReset;
        }
        this.isUpdatingTotp = false;
      },
      error: (err) => {
        console.error('Erro ao atualizar QR Code:', err);
        this.isUpdatingTotp = false;
      },
    });
  }

  // Controlo da checkbox de bloqueio do utilizador
  toggleUserBlock(): void {
    if (!this.selectedUser || this.isUpdatingBlockStatus) return;

    this.isUpdatingBlockStatus = true;
    const newBlockedState = !this.isUserBlocked;

    this.authService
      .toggleUserStatus(this.selectedUser.pk, newBlockedState)
      .subscribe({
        next: (res: any) => {
          this.isUserBlocked = Boolean(res.is_blocked);
          const newIsActive = !this.isUserBlocked;
          this.selectedUser.is_active = newIsActive;

          const foundUser = this.users.find((u) => u.pk === this.selectedUser.pk);
          if (foundUser) {
            foundUser.is_active = newIsActive;
          }
          this.isUpdatingBlockStatus = false;
        },
        error: (err) => {
          console.error('Erro ao atualizar estado de bloqueio:', err);
          this.isUpdatingBlockStatus = false;
        },
      });
  }
}

import { Component, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../../layout/header/header.component';
import { TitlebannerComponent } from '../../layout/titlebanner/titlebanner.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-edit-user',
  standalone: true,
  templateUrl: './edit-user.component.html',
  styleUrl: './edit-user.component.css',
  imports: [
    HeaderComponent,
    TitlebannerComponent,
    ReactiveFormsModule,
    CommonModule,
    FormsModule,
    RouterModule,
  ],
})
export class EditUserComponent implements OnInit {
  isAdminSelected: boolean = true;
  clients: any[] = [];
  clientNames: string[] = [];
  userId: string = '';

  // Flag para controlo do reset manual de TOTP
  forceTotpReset: boolean = false;

  isChangePasswordModalOpen: boolean = false;

  user: any = {
    username: '',
    companies: [],
    email: '',
    otpMethod: 'totp',
  };

  updateUserForm = new FormGroup({
    username: new FormControl('', [Validators.required]),
    companies: new FormControl<string[]>({ value: [], disabled: true }),
    email: new FormControl('', [Validators.required, Validators.email]),
    otpMethod: new FormControl('totp', [Validators.required]),
  });

  changePasswordForm = new FormGroup({
    newPassword: new FormControl('', [Validators.required]),
    confirmPassword: new FormControl('', [Validators.required]),
  });

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.userId = params['id'];
      this.loadUserData(this.userId);
    });

    this.authService.getClients().subscribe((data: any) => {
      this.clients = Array.isArray(data) ? data : [];
      this.clientNames = this.clients.map((client: any) => client.name);
    });
  }

  // Getters para validações no template
  get username() {
    return this.updateUserForm.get('username');
  }

  get companies() {
    return this.updateUserForm.get('companies');
  }

  get email() {
    return this.updateUserForm.get('email');
  }

  get otpMethod() {
    return this.updateUserForm.get('otpMethod');
  }

  get newPassword() {
    return this.changePasswordForm.get('newPassword');
  }

  get confirmPassword() {
    return this.changePasswordForm.get('confirmPassword');
  }

  // Controlo do botão de forçar QR Code
  toggleResetTotp(): void {
    this.forceTotpReset = !this.forceTotpReset;
  }

  // Gestão de Perfil / Roles
  trueIsAdminSelected(): void {
    this.isAdminSelected = true;
    const compCtrl = this.updateUserForm.get('companies');
    compCtrl?.disable();
    compCtrl?.clearValidators();
    compCtrl?.setValue([]);
    compCtrl?.updateValueAndValidity();
  }

  falseIsAdminSelected(): void {
    this.isAdminSelected = false;
    const compCtrl = this.updateUserForm.get('companies');
    compCtrl?.enable();
    compCtrl?.setValidators(Validators.required);
    compCtrl?.updateValueAndValidity();
  }

  // Gestão de Seleção de Clientes (Pills)
  toggleCompany(client: string): void {
    const compCtrl = this.updateUserForm.get('companies');
    const currentList: string[] = compCtrl?.value || [];

    if (currentList.includes(client)) {
      compCtrl?.setValue(currentList.filter((c) => c !== client));
    } else {
      compCtrl?.setValue([...currentList, client]);
    }

    compCtrl?.markAsDirty();
    compCtrl?.markAsTouched();
  }

  isCompanySelected(client: string): boolean {
    const currentList: string[] =
      this.updateUserForm.get('companies')?.value || [];
    return currentList.includes(client);
  }

  clearAllCompanies(): void {
    const compCtrl = this.updateUserForm.get('companies');
    compCtrl?.setValue([]);
    compCtrl?.markAsDirty();
    compCtrl?.markAsTouched();
  }

  // Carregamento de Dados
  loadUserData(userId: string): void {
    this.authService.getUsers().subscribe((data: any) => {
      const user = data.find((u: any) => u.pk == userId);

      if (user) {
        this.user = {
          ...user,
          companies: Array.isArray(user.companies) ? user.companies : [],
        };

        const isUserAdmin = Boolean(user.is_superuser || user.is_admin);

        this.updateUserForm.patchValue({
          username: this.user.username,
          companies: this.user.companies,
          email: this.user.email,
          otpMethod: this.user.otpMethod || 'totp',
        });

        if (isUserAdmin || this.user.companies.length === 0) {
          this.trueIsAdminSelected();
        } else {
          this.falseIsAdminSelected();
        }
      }
    });
  }

  // Submissão de Atualização
  updateUser(): void {
    if (this.updateUserForm.invalid) {
      this.updateUserForm.markAllAsTouched();
      return;
    }

    const userData = {
      username: this.username?.value || '',
      companies: this.isAdminSelected ? [] : this.companies?.value || [],
      email: this.email?.value || '',
      otpMethod: this.otpMethod?.value || 'totp',
      resetTotp: this.forceTotpReset,
    };

    this.authService.updateUserInfo(userData, this.userId).subscribe({
      next: () => {
        this.router.navigate(['/manage-users']);
      },
      error: (err) => console.error('Erro ao atualizar utilizador:', err),
    });
  }

  // Modal Alterar Password
  openChangePasswordModal(): void {
    this.changePasswordForm.reset();
    this.isChangePasswordModalOpen = true;
  }

  closeChangePasswordModal(): void {
    this.isChangePasswordModalOpen = false;
  }

  passwordsMatch(): boolean {
    const newPass = this.newPassword?.value;
    const confirmPass = this.confirmPassword?.value;
    return Boolean(newPass && confirmPass && newPass === confirmPass);
  }

  changePassword(): void {
    if (this.changePasswordForm.invalid || !this.passwordsMatch()) return;

    const newPass = this.newPassword?.value;
    if (!newPass) return;

    this.authService.changePassword(this.userId, newPass).subscribe({
      next: () => {
        this.closeChangePasswordModal();
      },
      error: (err) => console.error('Erro ao alterar password:', err),
    });
  }
}

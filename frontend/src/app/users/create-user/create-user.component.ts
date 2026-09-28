import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { HeaderComponent } from '../../layout/header/header.component';
import { TitlebannerComponent } from '../../layout/titlebanner/titlebanner.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-create-user',
  standalone: true,
  templateUrl: './create-user.component.html',
  styleUrls: ['./create-user.component.css'],
  imports: [
    HeaderComponent,
    TitlebannerComponent,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
  ],
})
export class CreateUserComponent implements OnInit {
  isAdminSelected: boolean = true;
  clients: any[] = [];
  clientNames: string[] = [];

  createUserForm = new FormGroup({
    username: new FormControl('', [Validators.required]),
    companies: new FormControl<string[]>({ value: [], disabled: true }),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(6),
    ]),
    otpMethod: new FormControl('totp', [Validators.required]),
  });

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.createUserForm.get('companies')?.disable();

    this.authService.getClients().subscribe({
      next: (data: any) => {
        this.clients = Array.isArray(data) ? data : [];
        this.clientNames = this.clients.map((client: any) => client.name);
      },
      error: (err) => console.error('Erro ao carregar clientes:', err),
    });
  }

  // Getters para controlo e validação no template
  get username() {
    return this.createUserForm.get('username');
  }

  get companies() {
    return this.createUserForm.get('companies');
  }

  get email() {
    return this.createUserForm.get('email');
  }

  get password() {
    return this.createUserForm.get('password');
  }

  get otpMethod() {
    return this.createUserForm.get('otpMethod');
  }

  // Gestão de Perfil / Roles
  trueIsAdminSelected(): void {
    this.isAdminSelected = true;
    const compCtrl = this.createUserForm.get('companies');
    compCtrl?.disable();
    compCtrl?.clearValidators();
    compCtrl?.setValue([]);
    compCtrl?.updateValueAndValidity();
  }

  falseIsAdminSelected(): void {
    this.isAdminSelected = false;
    const compCtrl = this.createUserForm.get('companies');
    compCtrl?.enable();
    compCtrl?.setValidators(Validators.required);
    compCtrl?.updateValueAndValidity();
  }

  // Gestão de Seleção de Clientes (Pills)
  toggleCompany(client: string): void {
    const compCtrl = this.createUserForm.get('companies');
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
      this.createUserForm.get('companies')?.value || [];
    return currentList.includes(client);
  }

  clearAllCompanies(): void {
    const compCtrl = this.createUserForm.get('companies');
    compCtrl?.setValue([]);
    compCtrl?.markAsDirty();
    compCtrl?.markAsTouched();
  }

  // Submissão do Formulário
  createUser(): void {
    if (this.createUserForm.invalid) {
      this.createUserForm.markAllAsTouched();
      return;
    }

    const userData = {
      username: this.username?.value || '',
      companies: this.isAdminSelected ? [] : this.companies?.value || [],
      email: this.email?.value || '',
      password: this.password?.value || '',
      otpMethod: this.otpMethod?.value || 'totp',
    };

    this.authService.createUser(userData).subscribe({
      next: () => {
        this.router.navigate(['/manage-users']);
      },
      error: (err) => console.error('Erro ao registar utilizador:', err),
    });
  }
}

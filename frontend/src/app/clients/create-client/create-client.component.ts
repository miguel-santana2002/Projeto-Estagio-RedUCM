import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { RulesService } from '../../services/rules.service';
import { HeaderComponent } from '../../layout/header/header.component';
import { TitlebannerComponent } from '../../layout/titlebanner/titlebanner.component';
import { TagComboboxComponent } from '../../shared/components/tag-combobox/tag-combobox.component';

@Component({
  selector: 'app-create-client',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TagComboboxComponent,
    HeaderComponent,
    TitlebannerComponent,
  ],
  templateUrl: './create-client.component.html',
  styleUrls: ['./create-client.component.css'],
})
export class CreateClientComponent implements OnInit {
  registeredLogsources: string[] = [];
  errorMessage: string = '';
  isCreating: boolean = false;

  // Controlo de permissões
  isAdmin: boolean = true;
  isOperator: boolean = false;

  createClientForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    siem: new FormControl('', [Validators.required]),
    logsources: new FormControl<any>(null, [Validators.required]),
  });

  constructor(
    private authService: AuthService,
    private rulesService: RulesService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.checkUserRole();
  }

  checkUserRole(): void {
    this.authService.loggedInInfo().subscribe({
      next: (res: any) => {
        if (res && res.is_admin !== undefined) {
          this.isAdmin = Boolean(res.is_admin);
          this.isOperator = !this.isAdmin;
        }
        if (this.isAdmin) {
          this.loadRegisteredLogSources();
        }
      },
      error: (err) => {
        console.error('Erro ao verificar permissões do utilizador:', err);
        this.loadRegisteredLogSources();
      },
    });
  }

  loadRegisteredLogSources(): void {
    this.rulesService.getRegisteredLogSources().subscribe({
      next: (data: any) => {
        this.registeredLogsources = Array.isArray(data)
          ? data.map((ls: any) => ls.name).filter(Boolean)
          : [];
      },
      error: (err) => {
        console.error('Erro ao obter log sources:', err);
      },
    });
  }

  createClient(): void {
    if (!this.isAdmin || this.createClientForm.invalid || this.isCreating) {
      return;
    }

    this.errorMessage = '';
    this.isCreating = true;

    const logsourcesValue: any = this.createClientForm.get('logsources')?.value;
    const logsources = Array.isArray(logsourcesValue)
      ? logsourcesValue.map((item: any) =>
          typeof item === 'string'
            ? item
            : item?.value || item?.display || item?.name || String(item),
        )
      : [];

    const payload = {
      name: this.createClientForm.get('name')?.value?.trim() || '',
      siem: this.createClientForm.get('siem')?.value || '',
      logsources: logsources,
    };

    this.authService.createClient(payload).subscribe({
      next: () => {
        this.isCreating = false;
        this.router.navigate(['/manage-clients']);
      },
      error: (err: any) => {
        this.isCreating = false;
        console.error('Erro ao criar cliente:', err);
        this.errorMessage =
          err.error?.error || 'Erro ao comunicar com o servidor ao criar o cliente.';
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/manage-clients']);
  }
}


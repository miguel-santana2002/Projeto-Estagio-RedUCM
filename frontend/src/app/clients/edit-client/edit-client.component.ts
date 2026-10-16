import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { RulesService } from '../../services/rules.service';
import { HeaderComponent } from '../../layout/header/header.component';
import { TitlebannerComponent } from '../../layout/titlebanner/titlebanner.component';
import { TagComboboxComponent } from '../../shared/components/tag-combobox/tag-combobox.component';

@Component({
  selector: 'app-edit-client',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TagComboboxComponent,
    HeaderComponent,
    TitlebannerComponent,
  ],
  templateUrl: './edit-client.component.html',
  styleUrls: ['./edit-client.component.css'],
})
export class EditClientComponent implements OnInit {
  clientId!: number;
  registeredLogsources: string[] = [];
  errorMessage: string = '';
  isLoading: boolean = true;

  // Controlo de permissões
  isAdmin: boolean = true;
  isOperator: boolean = false;

  editClientForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    siem: new FormControl('', [Validators.required]),
    logsources: new FormControl<any>(null, [Validators.required]),
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private rulesService: RulesService,
  ) {}

  ngOnInit(): void {
    this.clientId = Number(this.route.snapshot.paramMap.get('id'));
    this.checkUserRole();
  }

  checkUserRole(): void {
    this.authService.loggedInInfo().subscribe({
      next: (res: any) => {
        if (res && res.is_admin !== undefined) {
          this.isAdmin = Boolean(res.is_admin);
          this.isOperator = !this.isAdmin;
        }
        this.loadRegisteredLogSources();
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
          ? data.map((logsource: any) => logsource.name).filter(Boolean)
          : [];
        this.loadClientData();
      },
      error: (err) => {
        console.error('Erro ao obter log sources:', err);
        this.loadClientData(); // Tenta carregar o cliente mesmo se as logsources falharem
      },
    });
  }

  loadClientData(): void {
    this.authService.getClientById(this.clientId).subscribe({
      next: (client: any) => {
        const clientLogs = Array.isArray(client.logsources)
          ? client.logsources.map((log: any) =>
              typeof log === 'string'
                ? log
                : log.name || log.display || log.value,
            )
          : [];

        this.editClientForm.patchValue({
          name: client.name,
          siem: client.siem || '',
          logsources: clientLogs,
        });

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar dados do cliente:', err);
        this.errorMessage = 'Erro ao carregar dados do cliente.';
        this.isLoading = false;
      },
    });
  }

  updateClient(): void {
    if (!this.isAdmin || this.editClientForm.invalid) {
      return;
    }

    this.errorMessage = '';

    const logsourcesValue: any = this.editClientForm.get('logsources')?.value;
    const logsources = Array.isArray(logsourcesValue)
      ? logsourcesValue.map((item: any) =>
          typeof item === 'string'
            ? item
            : item?.value || item?.display || item?.name || String(item),
        )
      : [];

    const payload = {
      name: this.editClientForm.get('name')?.value,
      siem: this.editClientForm.get('siem')?.value,
      logsources: logsources,
    };

    this.authService.updateCompany(this.clientId, payload).subscribe({
      next: () => {
        this.router.navigate(['/manage-clients']);
      },
      error: (err: any) => {
        console.error('Erro ao atualizar cliente:', err);
        this.errorMessage =
          err.error?.error || 'Erro ao comunicar com o servidor.';
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/manage-clients']);
  }
}
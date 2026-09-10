import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TagInputModule } from 'ngx-chips';

import { AuthService } from '../../services/auth.service';
import { RulesService } from '../../services/rules.service';
import { HeaderComponent } from '../../layout/header/header.component';
import { TitlebannerComponent } from '../../layout/titlebanner/titlebanner.component';

@Component({
  selector: 'app-edit-client',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TagInputModule,
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

  editClientForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
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

    // 1. Extração correta do nome das log sources via API
    this.rulesService.getRegisteredLogSources().subscribe({
      next: (data: any) => {
        this.registeredLogsources = data.map(
          (logsource: any) => logsource.name,
        );
        this.loadClientData();
      },
      error: (err) => {
        console.error('Erro ao obter log sources:', err);
        this.isLoading = false;
      },
    });
  }

  loadClientData(): void {
    this.authService.getClientById(this.clientId).subscribe({
      next: (client: any) => {
        // 2. Converte as strings que vêm da BD no formato de objeto { display, value } exigido pelo ngx-chips
        const formattedLogs = (client.logsources || []).map((log: string) => ({
          display: log,
          value: log,
        }));

        this.editClientForm.patchValue({
          name: client.name,
          logsources: formattedLogs,
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
    if (this.editClientForm.invalid) {
      return;
    }

    this.errorMessage = '';

    // 3. Desempacota o valor das tags da mesma forma que fazes no createClient
    const logsourcesArray: any = this.editClientForm.get('logsources')?.value;
    const logsources = logsourcesArray?.map((item: any) =>
      typeof item === 'string' ? item : item.value,
    );

    const payload = {
      name: this.editClientForm.get('name')?.value,
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

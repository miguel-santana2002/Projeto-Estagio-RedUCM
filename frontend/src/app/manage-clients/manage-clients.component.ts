import { Component, ViewChild, ElementRef } from '@angular/core';
import { HeaderComponent } from '../layout/header/header.component';
import { TitlebannerComponent } from '../layout/titlebanner/titlebanner.component';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TagInputModule } from 'ngx-chips';
import { RulesService } from '../services/rules.service';

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
export class ManageClientsComponent {
  @ViewChild('modal') modal!: ElementRef;

  sortType = 'name';
  sortReverse = false;
  nameSearch: string = '';
  selectDelete: number = 9999999;
  errorMessage: string = '';
  clients: any = [];

  isCreateModalOpen: boolean = false;

  constructor(
    private authService: AuthService,
    private rulesService: RulesService,
  ) {}

  registeredLogsources: any = [];

  ngOnInit() {
    this.authService.getClients().subscribe((data: any) => {
      this.clients = data;

      console.log(data);

      this.rulesService.getRegisteredLogSources().subscribe((data: any) => {
        console.log(data);
        this.registeredLogsources = data.map(
          (logsource: any) => logsource.name,
        );
      });
    });
  }

  openModal() {
    this.modal.nativeElement.classList.remove('hidden');
    this.modal.nativeElement.classList.add('flex');
  }

  closeModal() {
    this.modal.nativeElement.classList.add('hidden');
    this.modal.nativeElement.classList.remove('flex');
  }

  openCreateModal() {
    this.isCreateModalOpen = true;
  }

  closeCreateModal() {
    this.isCreateModalOpen = false;
  }

  deleteClient() {
    this.authService.deleteCompany(this.selectDelete).subscribe({
      next: (response) => {
        console.log('Cliente apagado:', response);
        // Atualiza a tabela
        this.authService.getClients().subscribe((data: any) => {
          this.clients = data;
        });
      },
      error: (err) => {
        console.error('Erro ao apagar o cliente no backend:', err);
        alert('Erro ao apagar. Vê a consola (F12) para mais detalhes.');
      },
    });
  }

  updateSelectDelete(id: number) {
    this.selectDelete = id;
  }

  client: any = {
    name: '',
  };

  createClientForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    logsources: new FormControl(null, [Validators.required]),
  });

  get name() {
    return this.createClientForm.get('name');
  }

  createClient() {
    this.errorMessage = '';
    var logsourcesArray: any = this.createClientForm.get('logsources')?.value;
    var logsources = logsourcesArray?.map((logsource: any) => logsource.value);

    const clientData = {
      name: this.name!.value!,
      logsources: logsources,
    };

    console.log(clientData);

    this.authService.createClient(clientData).subscribe({
      next: (response) => {
        console.log(response);
        this.authService.getClients().subscribe((data: any) => {
          this.clients = data;
        });
        this.createClientForm.reset();

        this.closeCreateModal();
      },
      error: (err: any) => {
        console.error('Erro na API:', err);

        // Extrai a mensagem de erro formatada enviada pelo Django
        this.errorMessage =
          err.error?.error || 'Erro ao comunicar com o servidor.';
      },
    });
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

      // 1. Tratar arrays (Logsources) ordenando pela quantidade de itens
      if (Array.isArray(valueA) && Array.isArray(valueB)) {
        return this.sortNumeric(valueA.length, valueB.length);
      }
      // 2. Tratar Strings (Nome, Data)
      else if (typeof valueA === 'string') {
        return this.sortString(valueA, valueB);
      }
      // 3. Tratar Números (ID / pk)
      else {
        return this.sortNumeric(valueA, valueB);
      }
    });
  }

  private sortString(a: string, b: string): number {
    return a.localeCompare(b) * (this.sortReverse ? -1 : 1);
  }

  private sortNumeric(a: number, b: number): number {
    return (a - b) * (this.sortReverse ? -1 : 1);
  }

  get filteredClients() {
    return this.clients.filter((u: any) =>
      u.name.toLowerCase().includes(this.nameSearch.toLowerCase()),
    );
  }
}

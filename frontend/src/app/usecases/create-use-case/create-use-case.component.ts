import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { TagInputModule } from 'ngx-chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

import { TitlebannerComponent } from '../../layout/titlebanner/titlebanner.component';
import { HeaderComponent } from '../../layout/header/header.component';
import { MitreService } from '../../services/mitre.service';
import { UsecasesService } from '../../services/usecases.service';

@Component({
  selector: 'app-create-use-case',
  standalone: true,
  templateUrl: './create-use-case.component.html',
  styleUrls: ['./create-use-case.component.css'],
  imports: [
    TitlebannerComponent,
    HeaderComponent,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    TagInputModule,
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
  ],
})
export class CreateUseCaseComponent implements OnInit {
  constructor(
    private mitreService: MitreService,
    private usecasesService: UsecasesService,
    private router: Router,
  ) {}

  chavesTaxonomia = [
    'Código Malicioso',
    'Disponibilidade',
    'Recolha de Informação',
    'Intrusão',
    'Tentativa de Intrusão',
    'Segurança da Informação',
    'Fraude',
    'Conteúdo Abusivo',
    'Vulnerabilidade',
    'Outro',
  ];
  selectedCategory: string = '';
  selectedSubcategory: string = '';
  selectedCategoryValues: string[] = [];

  mitreAutocompleteList: string[] = [];
  selectedFile: File | null = null;
  errorMessage: string = '';

  createUseCaseForm = new FormGroup({
    title: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
    mitigation: new FormControl('', Validators.required),
    playbook: new FormControl(''),
    mitreTechniques: new FormControl([], Validators.required),
    cncsClass: new FormControl('', Validators.required),
    cncsType: new FormControl('', Validators.required),
    attackVectors: new FormControl([], Validators.required),
  });

  taxonomiaCNCS: any = [
    {
      'Código Malicioso': [
        'Sistema Infetado',
        'Distribuição de Malware',
        'Servidor C2',
        'Configuração de Malware',
      ],
    },
    {
      Disponibilidade: [
        'Negação de Serviço',
        'Abuso de Recursos',
        'Outage / Indisponibilidade',
      ],
    },
    {
      'Recolha de Informação': [
        'Scanners de Vulnerabilidades',
        'Social Engineering',
        'Scanning / Probing',
      ],
    },
    {
      Intrusão: [
        'Exploração de Vulnerabilidades',
        'Comprometimento de Contas',
        'Obtenção de Credenciais',
      ],
    },
    {
      'Tentativa de Intrusão': [
        'Tentativa de Exploração de Vulnerabilidades',
        'Força Bruta / Password Spraying',
      ],
    },
    {
      'Segurança da Informação': [
        'Roubo de Informação',
        'Exfiltração de Dados',
        'Alteração de Informação',
      ],
    },
    {
      Fraude: [
        'Burlas',
        'Roubo de Identidade / Falsificação',
        'Uso Indevido de Recursos',
      ],
    },
    {
      'Conteúdo Abusivo': [
        'SPAM',
        'Phishing',
        'Alojamento Indevido de Conteúdos',
      ],
    },
    { Vulnerabilidade: ['Sistema Vulnerável', 'Aplicação Vulnerável'] },
    { Outro: ['Outro'] },
  ];

  ngOnInit(): void {
    this.loadMitreTechniques();
  }

  loadMitreTechniques(): void {
    this.mitreService.getAllTechniques().subscribe({
      next: (data: any[]) => {
        this.mitreAutocompleteList = data.map(
          (t: any) => `${t.id} - ${t.name}`,
        );
      },
      error: (error) => {
        console.error('Erro ao carregar técnicas MITRE:', error);
      },
    });
  }

  updateCNCSValues(): void {
    this.selectedCategory =
      this.createUseCaseForm.get('cncsClass')?.value || '';
    this.selectedCategoryValues =
      this.taxonomiaCNCS.find(
        (entry: { [x: string]: any }) => entry[this.selectedCategory],
      )?.[this.selectedCategory] || [];
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  createUseCase(): void {
    if (this.createUseCaseForm.invalid) {
      this.createUseCaseForm.markAllAsTouched();
      return;
    }

    const useCase: any = this.createUseCaseForm.value;

    useCase.rules = [];
    useCase.phaseTasks = [
      { phase: 'Preparation', tasks: [] },
      { phase: 'Detection and Analysis', tasks: [] },
      { phase: 'Containment, Eradication and Recovery', tasks: [] },
      { phase: 'Post-Event Activity', tasks: [] },
    ];

    // 1. Extração segura de ID + Nome da Técnica MITRE
    if (useCase.mitreTechniques != null) {
      useCase.mitreTechniques = useCase.mitreTechniques.map(
        (technique: any) => {
          let val =
            technique?.display ||
            technique?.value ||
            technique?.name ||
            (typeof technique === 'string' ? technique : technique?.id);

          if (typeof val === 'string') {
            val = val.trim();
            // Se porventura vier apenas o ID (ex: "T1047"), recupera a string completa da lista
            if (!val.includes(' - ')) {
              const match = this.mitreAutocompleteList.find(
                (item: string) => item.startsWith(val + ' - ') || item === val,
              );
              if (match) {
                val = match;
              }
            }
          }
          return val;
        },
      );
    }

    // 2. Extração limpa dos vetores de ataque
    if (useCase.attackVectors != null) {
      useCase.attackVectors = useCase.attackVectors.map((vector: any) => {
        return vector?.value || vector?.display || vector?.id || vector;
      });
    }

    // 3. Montagem do FormData
    const useCaseData = new FormData();
    useCaseData.append('title', useCase.title);
    useCaseData.append('description', useCase.description);
    useCaseData.append('mitigation', useCase.mitigation);
    useCaseData.append('cncsClass', useCase.cncsClass);
    useCaseData.append('cncsType', useCase.cncsType);

    // Anexa o ficheiro apenas se existir (evita erros de FileField no Django)
    if (this.selectedFile) {
      useCaseData.append('playbook', this.selectedFile);
    }

    useCaseData.append(
      'mitreTechniques',
      JSON.stringify(useCase.mitreTechniques),
    );
    useCaseData.append('attackVectors', JSON.stringify(useCase.attackVectors));
    useCaseData.append('rules', JSON.stringify(useCase.rules));
    useCaseData.append('phaseTasks', JSON.stringify(useCase.phaseTasks));

    this.usecasesService.createUseCase(useCaseData).subscribe({
      next: () => {
        this.router.navigate(['/manage-usecases']);
      },
      error: (error) => {
        console.error('Erro ao criar o Use Case:', error);
        this.errorMessage =
          error.error?.detail ||
          error.error?.error ||
          'Erro ao criar Use Case no servidor.';
      },
    });
  }
}

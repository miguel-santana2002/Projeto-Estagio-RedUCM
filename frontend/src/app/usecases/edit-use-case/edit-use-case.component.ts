import { Component, OnInit } from '@angular/core';
import { TitlebannerComponent } from '../../layout/titlebanner/titlebanner.component';
import { HeaderComponent } from '../../layout/header/header.component';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TagInputModule } from 'ngx-chips';

import { MitreService } from '../../services/mitre.service';
import { UsecasesService } from '../../services/usecases.service';

@Component({
  selector: 'app-edit-use-case',
  standalone: true,
  templateUrl: './edit-use-case.component.html',
  styleUrl: './edit-use-case.component.css',
  imports: [
    TitlebannerComponent,
    HeaderComponent,
    TagInputModule,
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    RouterModule,
  ],
})
export class EditUseCaseComponent implements OnInit {
  useCaseId!: number;
  playbookLink: string = '';
  errorMessage: string = '';
  selectedFile: File | null = null;

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

  chavesTaxonomia: string[] = [
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
  selectedCategoryValues: string[] = [];
  mitreAutocompleteList: string[] = [];

  editUseCaseForm = new FormGroup({
    title: new FormControl('', [Validators.required]),
    description: new FormControl('', [Validators.required]),
    mitigation: new FormControl('', [Validators.required]),
    playbook: new FormControl(''), // Opcional na edição
    mitreTechniques: new FormControl<any[]>([], [Validators.required]),
    cncsClass: new FormControl('', [Validators.required]),
    cncsType: new FormControl('', [Validators.required]),
    attackVectors: new FormControl<any[]>([], [Validators.required]),
  });

  constructor(
    private route: ActivatedRoute,
    private mitreService: MitreService,
    private usecasesService: UsecasesService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadMitreTechniques();

    const paramId = this.route.snapshot.paramMap.get('id');
    if (paramId) {
      this.useCaseId = Number(paramId);

      this.usecasesService.getUseCaseById(this.useCaseId).subscribe({
        next: (useCase: any) => {
          // 1. Sanitização das Mitre Techniques (suporta array ou string do Postgres)
          let mitreData = useCase.mitreTechniques || [];
          if (typeof mitreData === 'string') {
            mitreData = mitreData
              .replace(/[{}]/g, '')
              .split(',')
              .filter(Boolean);
          }

          // 2. Sanitização dos Attack Vectors
          let vectorData = useCase.attackVectors || [];
          if (typeof vectorData === 'string') {
            vectorData = vectorData
              .replace(/[{}]/g, '')
              .split(',')
              .filter(Boolean);
          }

          // 3. Atualizar subcategorias da Taxonomia antes de aplicar o tipo
          this.selectedCategory = useCase.cncsClass || '';
          this.editUseCaseForm.get('cncsClass')?.setValue(useCase.cncsClass);
          this.updateCNCSValues();

          // 4. Preenchimento do formulário
          this.editUseCaseForm.patchValue({
            title: useCase.title,
            description: useCase.description,
            mitigation: useCase.mitigation,
            mitreTechniques: mitreData,
            attackVectors: vectorData,
            cncsType: useCase.cncsType,
          });

          // 5. Guardar nome do ficheiro para consulta
          if (useCase.playbook) {
            this.playbookLink =
              typeof useCase.playbook === 'string'
                ? useCase.playbook.split('/').pop() || useCase.playbook
                : '';
          }
        },
        error: (err) => {
          console.error('Erro ao carregar use case:', err);
          this.errorMessage =
            'Não foi possível carregar os detalhes do Use Case.';
        },
      });
    }
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
    this.selectedCategory = this.editUseCaseForm.get('cncsClass')?.value || '';
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

  updateUseCase(): void {
    if (this.editUseCaseForm.invalid) {
      this.editUseCaseForm.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    const formVal: any = this.editUseCaseForm.value;

    const useCaseData = new FormData();
    useCaseData.append('title', formVal.title);
    useCaseData.append('description', formVal.description);
    useCaseData.append('mitigation', formVal.mitigation);
    useCaseData.append('cncsClass', formVal.cncsClass);
    useCaseData.append('cncsType', formVal.cncsType);

    // CRÍTICO: Apenas enviar 'playbook' se houver um NOVO ficheiro binário selecionado
    if (this.selectedFile) {
      useCaseData.append('playbook', this.selectedFile);
    }

    // Extração limpa de valores das tags
    const formattedAttackVectors = (formVal.attackVectors || []).map(
      (av: any) => (typeof av === 'string' ? av : av.value || av.display || av),
    );
    useCaseData.append(
      'attackVectors',
      `{${formattedAttackVectors.join(',')}}`,
    );

    const formattedMitreTechniques = (formVal.mitreTechniques || []).map(
      (mt: any) =>
        typeof mt === 'string' ? mt : mt.value || mt.id || mt.display || mt,
    );
    useCaseData.append(
      'mitreTechniques',
      `{${formattedMitreTechniques.join(',')}}`,
    );

    useCaseData.append('rules', '{}');
    useCaseData.append(
      'phaseTasks',
      JSON.stringify([
        { phase: 'Preparation', tasks: [] },
        { phase: 'Detection and Analysis', tasks: [] },
        { phase: 'Containment, Eradication and Recovery', tasks: [] },
        { phase: 'Post-Event Activity', tasks: [] },
      ]),
    );

    this.usecasesService.updateUseCase(this.useCaseId, useCaseData).subscribe({
      next: () => {
        this.router.navigate(['/manage-usecases']);
      },
      error: (error: any) => {
        console.error('Erro ao atualizar o Use Case:', error);
        this.errorMessage =
          error.error?.detail ||
          error.error?.error ||
          (typeof error.error === 'object'
            ? JSON.stringify(error.error)
            : 'Erro ao atualizar o Use Case.');
      },
    });
  }
}

import { Component, OnInit, isDevMode } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { TagInputModule } from 'ngx-chips';

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
    RouterModule, // Adicionado para suportar [routerLink]
  ],
})
export class CreateUseCaseComponent implements OnInit {
  rawMitreData: any[] = [];
  mitreAutocompleteList: string[] = [];
  filteredTechniquesList: string[] = [];
  allTacticsList: string[] = [];
  private tacticsByTechnique = new Map<string, string[]>();

  // Táticas escolhidas explicitamente pelo utilizador (separadas das derivadas de técnicas)
  private manualTactics = new Set<string>();

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
  selectedCategory: string = '';
  selectedCategoryValues: string[] = [];

  selectedFile: File | null = null;
  errorMessage: string = '';

  createUseCaseForm = new FormGroup({
    title: new FormControl('', Validators.required),
    description: new FormControl(''),
    mitigation: new FormControl(''),
    playbook: new FormControl(''),
    mitreTechniques: new FormControl<string[]>([], Validators.required),
    tactics: new FormControl<string[]>([], Validators.required),
    cncsClass: new FormControl(''),
    cncsClassCustom: new FormControl(''),
    cncsType: new FormControl(''),
    cncsTypeCustom: new FormControl(''),
  });

  constructor(
    private mitreService: MitreService,
    private usecasesService: UsecasesService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadMitreTechniques();
  }

  loadMitreTechniques(): void {
    this.mitreService.getAllTechniques().subscribe({
      next: (data: any[]) => {
        if (!data || data.length === 0) {
          this.handleLoadFailure('A API MITRE devolveu uma lista vazia.');
          return;
        }

        this.errorMessage = '';
        this.rawMitreData = data;
        this.tacticsByTechnique.clear();
        const tacticSet = new Set<string>();

        this.rawMitreData.forEach((tech: any) => {
          const names = this.extractTactics(tech);
          this.tacticsByTechnique.set(tech.id, names);
          names.forEach((n) => tacticSet.add(n));
        });

        this.allTacticsList = Array.from(tacticSet).sort();
        console.log('EXEMPLO TECNICA:', this.rawMitreData[0]);
        this.mitreAutocompleteList = this.rawMitreData.map(
          (t: any) => `${t.id} - ${t.name}`,
        );
        this.filteredTechniquesList = [...this.mitreAutocompleteList];
      },
      error: (error) => {
        console.error('Erro ao carregar técnicas MITRE:', error);
        this.handleLoadFailure(
          'Não foi possível carregar as técnicas MITRE. Verifique a ligação ao servidor.',
        );
      },
    });
  }

  // Parsing defensivo: suporta tactics como string, objeto {name|shortname}, ou kill_chain_phases[].phase_name
  private extractTactics(tech: any): string[] {
    const raw: any[] = Array.isArray(tech?.tactics)
      ? tech.tactics
      : Array.isArray(tech?.kill_chain_phases)
        ? tech.kill_chain_phases
        : [];

    return raw
      .map((t: any) => {
        if (typeof t === 'string') return this.prettyTactic(t);
        const val = t?.name || t?.shortname || t?.phase_name || '';
        return this.prettyTactic(val);
      })
      .filter((n: string) => !!n);
  }

  // Falha visível em produção; dados dummy apenas em ambiente de desenvolvimento
  private handleLoadFailure(message: string): void {
    if (isDevMode()) {
      console.warn(`[DEV] ${message} A usar dados de teste (dummy).`);
      this.loadDummyData();
    } else {
      this.errorMessage = message;
      this.rawMitreData = [];
      this.tacticsByTechnique.clear();
      this.allTacticsList = [];
      this.mitreAutocompleteList = [];
      this.filteredTechniquesList = [];
    }
  }

  loadDummyData(): void {
    this.allTacticsList = ['Defense Evasion', 'Execution', 'Persistence'];
    this.mitreAutocompleteList = [
      'T1059 - Command and Scripting Interpreter',
      'T1098 - Account Manipulation',
      'T1112 - Modify Registry',
    ];
    this.filteredTechniquesList = [...this.mitreAutocompleteList];

    this.tacticsByTechnique.clear();
    this.tacticsByTechnique.set('T1059', ['Execution']);
    this.tacticsByTechnique.set('T1098', ['Persistence', 'Defense Evasion']);
    this.tacticsByTechnique.set('T1112', ['Defense Evasion']);
  }

  // Utilizador alterou as táticas manualmente
  onTacticChange(): void {
    const selTactics: string[] =
      this.createUseCaseForm.get('tactics')?.value || [];
    this.manualTactics = new Set(selTactics);
    this.applyTacticFilter();
  }

  // Utilizador alterou as técnicas manualmente -> derivar/atualizar as táticas
  onTechniqueChange(): void {
    const selTechs: string[] =
      this.createUseCaseForm.get('mitreTechniques')?.value || [];
    const derived = new Set<string>(
      selTechs.flatMap(
        (t) => this.tacticsByTechnique.get(this.techId(t)) || [],
      ),
    );

    // União: táticas escolhidas manualmente + todas as táticas das técnicas selecionadas
    const union = Array.from(
      new Set([...this.manualTactics, ...derived]),
    ).sort();
    const tacticsCtrl = this.createUseCaseForm.get('tactics');
    const current: string[] = tacticsCtrl?.value || [];

    if (!this.sameSet(union, current)) {
      tacticsCtrl?.setValue(union);
    }
    this.applyTacticFilter();
  }

  // Recalcula a lista de técnicas visíveis e remove técnicas selecionadas que deixaram de ser válidas
  private applyTacticFilter(): void {
    const selTactics: string[] =
      this.createUseCaseForm.get('tactics')?.value || [];

    if (selTactics.length === 0) {
      this.filteredTechniquesList = [...this.mitreAutocompleteList];
      return;
    }

    this.filteredTechniquesList = this.mitreAutocompleteList.filter((label) => {
      const techTactics = this.tacticsByTechnique.get(this.techId(label)) || [];
      return techTactics.some((t) => selTactics.includes(t));
    });

    // Remover da seleção as técnicas que já não pertencem a nenhuma tática ativa
    const techCtrl = this.createUseCaseForm.get('mitreTechniques');
    const selTechs: string[] = techCtrl?.value || [];
    const validTechs = selTechs.filter((t) => {
      const techTactics = this.tacticsByTechnique.get(this.techId(t)) || [];
      return techTactics.some((x) => selTactics.includes(x));
    });
    if (validTechs.length !== selTechs.length) {
      techCtrl?.setValue(validTechs);
    }
  }

  private sameSet(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const sb = new Set(b);
    return a.every((x) => sb.has(x));
  }

  private techId(t: any): string {
    const val =
      typeof t === 'string' ? t : t?.display || t?.value || t?.id || '';
    return String(val).split(' - ')[0].trim();
  }

  private prettyTactic(name: string): string {
    return String(name || '')
      .replace(/[-_]/g, ' ')
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map((w) =>
        w.toLowerCase() === 'and'
          ? 'and'
          : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
      )
      .join(' ');
  }

  clearCNCSClass(event: Event): void {
    event.stopPropagation();
    this.createUseCaseForm.get('cncsClass')?.setValue('');
    this.createUseCaseForm.get('cncsClassCustom')?.setValue('');
    this.selectedCategoryValues = [];
    this.createUseCaseForm.get('cncsType')?.setValue('');
    this.createUseCaseForm.get('cncsTypeCustom')?.setValue('');
  }

  clearCNCSType(event: Event): void {
    event.stopPropagation();
    this.createUseCaseForm.get('cncsType')?.setValue('');
    this.createUseCaseForm.get('cncsTypeCustom')?.setValue('');
  }

  updateCNCSValues(): void {
    this.selectedCategory =
      this.createUseCaseForm.get('cncsClass')?.value || '';
    this.selectedCategoryValues =
      this.taxonomiaCNCS.find(
        (entry: { [x: string]: any }) => entry[this.selectedCategory],
      )?.[this.selectedCategory] || [];
    this.createUseCaseForm.get('cncsType')?.setValue('');
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

    const v = this.createUseCaseForm.value;
    const formData = new FormData();

    formData.append('title', v.title || '');
    formData.append('description', v.description || '');
    formData.append('mitigation', v.mitigation || '');

    const finalCncsClass =
      v.cncsClass === 'Outro' ? v.cncsClassCustom : v.cncsClass;
    const finalCncsType =
      v.cncsType === 'Outro' ? v.cncsTypeCustom : v.cncsType;

    formData.append('cncsClass', finalCncsClass || '');
    formData.append('cncsType', finalCncsType || '');

    formData.append('mitreTechniques', JSON.stringify(v.mitreTechniques || []));
    formData.append('tactics', JSON.stringify(v.tactics || []));

    if (this.selectedFile) {
      formData.append('playbook', this.selectedFile);
    }

    this.usecasesService.createUseCase(formData).subscribe({
      next: () => this.router.navigate(['/manage-usecases']),
      error: (err) => {
        console.error('Erro ao criar use case:', err);
        this.errorMessage =
          'Ocorreu um erro ao criar o Use Case. Tente novamente.';
      },
    });
  }
}

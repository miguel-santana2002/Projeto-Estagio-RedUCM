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
import { TagComboboxComponent } from '../../shared/components/tag-combobox/tag-combobox.component';

@Component({
  selector: 'app-create-use-case',
  standalone: true,
  templateUrl: './create-use-case.component.html',
  styleUrls: ['./create-use-case.component.css'],
  imports: [
    TitlebannerComponent,
    HeaderComponent,
    TagComboboxComponent,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    TagInputModule,
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    RouterModule,
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

  chavesTaxonomia: string[] = [
    'Malicious Code',
    'Availability',
    'Information Gathering',
    'Intrusion',
    'Intrusion Attempt',
    'Information Security',
    'Fraud',
    'Abusive Content',
    'Vulnerability',
    'Other',
  ];

  taxonomiaCNCS: any = [
    {
      'Malicious Code': [
        'Infected System',
        'Malware Distribution',
        'C2 Server',
        'Malware Configuration',
      ],
    },
    {
      Availability: [
        'Denial of Service',
        'Resource Abuse',
        'Outage / Unavailability',
      ],
    },
    {
      'Information Gathering': [
        'Vulnerability Scanners',
        'Social Engineering',
        'Scanning / Probing',
      ],
    },
    {
      Intrusion: [
        'Vulnerability Exploitation',
        'Account Compromise',
        'Credential Access',
      ],
    },
    {
      'Intrusion Attempt': [
        'Attempted Vulnerability Exploitation',
        'Brute Force / Password Spraying',
      ],
    },
    {
      'Information Security': [
        'Information Theft',
        'Data Exfiltration',
        'Information Alteration',
      ],
    },
    {
      Fraud: ['Scams', 'Identity Theft / Forgery', 'Misuse of Resources'],
    },
    {
      'Abusive Content': ['SPAM', 'Phishing', 'Improper Content Hosting'],
    },
    {
      Vulnerability: ['Vulnerable System', 'Vulnerable Application'],
    },
    {
      Other: ['Other'],
    },
  ];

  selectedCategory: string = '';
  selectedCategoryValues: string[] = [];

  selectedFile: File | null = null;
  errorMessage: string = '';

  createUseCaseForm = new FormGroup({
    title: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
    mitigation: new FormControl('', Validators.required),
    mitreTechniques: new FormControl<string[]>([], Validators.required),
    tactics: new FormControl<string[]>([], Validators.required),
    cncsClass: new FormControl('', Validators.required),
    cncsType: new FormControl('', Validators.required),
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

    const matched = this.mitreAutocompleteList.filter((label) => {
      const techTactics = this.tacticsByTechnique.get(this.techId(label)) || [];
      return techTactics.some((t) => selTactics.includes(t));
    });

    const techCtrl = this.createUseCaseForm.get('mitreTechniques');
    const selTechs: string[] = techCtrl?.value || [];

    // Manter as técnicas selecionadas visíveis na lista
    this.filteredTechniquesList = Array.from(
      new Set([...selTechs, ...matched]),
    );

    // Remover da seleção apenas técnicas do catálogo MITRE que deixaram de pertencer a uma tática ativa,
    // PRESERVANDO técnicas personalizadas escritas manualmente pelo utilizador.
    const validTechs = selTechs.filter((t) => {
      const techTactics = this.tacticsByTechnique.get(this.techId(t));
      if (!techTactics || techTactics.length === 0) {
        return true; // Técnica personalizada: preservar!
      }
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
    this.selectedCategoryValues = [];
    this.createUseCaseForm.get('cncsType')?.setValue('');
  }

  clearCNCSType(event: Event): void {
    event.stopPropagation();
    this.createUseCaseForm.get('cncsType')?.setValue('');
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

    // Os valores são agora extraídos diretamente da Form
    formData.append('cncsClass', v.cncsClass || '');
    formData.append('cncsType', v.cncsType || '');

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

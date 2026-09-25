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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

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
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
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

  rawMitreData: any[] = [];
  mitreAutocompleteList: string[] = [];
  filteredTechniquesList: string[] = [];
  allTacticsList: string[] = [];
  private tacticsByTechnique = new Map<string, string[]>();

  taxonomiaCNCS: any = [
    { 'Código Malicioso': ['Sistema Infetado', 'Distribuição de Malware', 'Servidor C2', 'Configuração de Malware'] },
    { Disponibilidade: ['Negação de Serviço', 'Abuso de Recursos', 'Outage / Indisponibilidade'] },
    { 'Recolha de Informação': ['Scanners de Vulnerabilidades', 'Social Engineering', 'Scanning / Probing'] },
    { Intrusão: ['Exploração de Vulnerabilidades', 'Comprometimento de Contas', 'Obtenção de Credenciais'] },
    { 'Tentativa de Intrusão': ['Tentativa de Exploração de Vulnerabilidades', 'Força Bruta / Password Spraying'] },
    { 'Segurança da Informação': ['Roubo de Informação', 'Exfiltração de Dados', 'Alteração de Informação'] },
    { Fraude: ['Burlas', 'Roubo de Identidade / Falsificação', 'Uso Indevido de Recursos'] },
    { 'Conteúdo Abusivo': ['SPAM', 'Phishing', 'Alojamento Indevido de Conteúdos'] },
    { Vulnerabilidade: ['Sistema Vulnerável', 'Aplicação Vulnerável'] },
    { Outro: ['Outro'] },
  ];

  chavesTaxonomia: string[] = [
    'Código Malicioso', 'Disponibilidade', 'Recolha de Informação', 'Intrusão',
    'Tentativa de Intrusão', 'Segurança da Informação', 'Fraude',
    'Conteúdo Abusivo', 'Vulnerabilidade', 'Outro',
  ];

  selectedCategory: string = '';
  selectedCategoryValues: string[] = [];

  editUseCaseForm = new FormGroup({
    title: new FormControl('', [Validators.required]),
    description: new FormControl('', [Validators.required]),
    mitigation: new FormControl('', [Validators.required]),
    playbook: new FormControl(''),
    mitreTechniques: new FormControl<any[]>([], [Validators.required]),
    cncsClass: new FormControl('', [Validators.required]),
    cncsType: new FormControl('', [Validators.required]),
    tactics: new FormControl<any[]>([], [Validators.required]), // Certifica-te que é 'tactics'
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
          let mitreData = useCase.mitreTechniques || [];
          if (typeof mitreData === 'string') {
            mitreData = mitreData.replace(/[{}]/g, '').split(',').filter(Boolean);
          }

          let tacticsData = useCase.tactics || [];
          if (typeof tacticsData === 'string') {
            tacticsData = tacticsData.replace(/[{}]/g, '').split(',').filter(Boolean);
          }

          this.selectedCategory = useCase.cncsClass || '';
          this.editUseCaseForm.get('cncsClass')?.setValue(useCase.cncsClass);
          this.updateCNCSValues();

          this.editUseCaseForm.patchValue({
            title: useCase.title,
            description: useCase.description,
            mitigation: useCase.mitigation,
            mitreTechniques: mitreData,
            tactics: tacticsData,
            cncsType: useCase.cncsType,
          });

          this.onTacticChange();

          if (useCase.playbook) {
            this.playbookLink =
              typeof useCase.playbook === 'string'
                ? useCase.playbook.split('/').pop() || useCase.playbook
                : '';
          }
        },
        error: (err) => {
          console.error('Erro ao carregar use case:', err);
          this.errorMessage = 'Não foi possível carregar os detalhes do Use Case.';
        },
      });
    }
  }

  loadMitreTechniques(): void {
    this.mitreService.getAllTechniques().subscribe({
      next: (data: any[]) => {
        this.rawMitreData = data || [];
        this.tacticsByTechnique.clear();
        const tacticSet = new Set<string>();

        this.rawMitreData.forEach((tech: any) => {
          const names: string[] = (tech.tactics || [])
            .map((t: any) => this.prettyTactic(typeof t === 'string' ? t : (t?.name || t?.shortname || '')))
            .filter((n: string) => n);

          this.tacticsByTechnique.set(tech.id, names);
          names.forEach((n) => tacticSet.add(n));
        });

        this.allTacticsList = Array.from(tacticSet).sort();
        this.mitreAutocompleteList = this.rawMitreData.map((t: any) => `${t.id} - ${t.name}`);
        this.filteredTechniquesList = [...this.mitreAutocompleteList];
        this.onTacticChange();
      },
      error: (error) => {
        console.error('Erro ao carregar técnicas MITRE:', error);
      },
    });
  }

  onTacticChange(): void {
    const selTactics: string[] = this.editUseCaseForm.get('tactics')?.value || [];
    const selTechs: string[] = this.editUseCaseForm.get('mitreTechniques')?.value || [];

    if (selTactics.length === 0) {
      this.filteredTechniquesList = [...this.mitreAutocompleteList];
    } else {
      const filtered = this.mitreAutocompleteList.filter((label) => {
        const techId = this.techId(label);
        const techTactics = this.tacticsByTechnique.get(techId) || [];
        return techTactics.some((t) => selTactics.includes(t));
      });
      this.filteredTechniquesList = Array.from(new Set([...selTechs, ...filtered]));
    }
  }

  onTechniqueChange(): void {
    const selTechs: string[] = this.editUseCaseForm.get('mitreTechniques')?.value || [];
    const tacticsCtrl = this.editUseCaseForm.get('tactics');
    const currentTactics: string[] = tacticsCtrl?.value || [];

    const derivedTactics = selTechs.flatMap((t) => this.tacticsByTechnique.get(this.techId(t)) || []);
    const unionTactics = Array.from(new Set([...currentTactics, ...derivedTactics]));

    if (unionTactics.length !== currentTactics.length) {
      tacticsCtrl?.setValue(unionTactics);
    }
    this.onTacticChange();
  }

  private techId(t: any): string {
    const val = typeof t === 'string' ? t : (t?.display || t?.value || t?.id || '');
    return val.split(' - ')[0].trim();
  }

  private prettyTactic(name: string): string {
    return name
      .replace(/[-_]/g, ' ')
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map((w) => (w.toLowerCase() === 'and' ? 'and' : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
      .join(' ');
  }

  updateCNCSValues(): void {
    this.selectedCategory = this.editUseCaseForm.get('cncsClass')?.value || '';
    this.selectedCategoryValues =
      this.taxonomiaCNCS.find((entry: { [x: string]: any }) => entry[this.selectedCategory])?.[this.selectedCategory] || [];
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

    if (this.selectedFile) {
      useCaseData.append('playbook', this.selectedFile);
    }

    const formattedTactics = (formVal.tactics || []).map(
      (t: any) => (typeof t === 'string' ? t : t.value || t.display || t),
    );
    useCaseData.append('tactics', `{${formattedTactics.join(',')}}`);

    const formattedMitreTechniques = (formVal.mitreTechniques || []).map(
      (mt: any) => (typeof mt === 'string' ? mt : mt.value || mt.id || mt.display || mt),
    );
    useCaseData.append('mitreTechniques', `{${formattedMitreTechniques.join(',')}}`);

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
          (typeof error.error === 'object' ? JSON.stringify(error.error) : 'Erro ao atualizar o Use Case.');
      },
    });
  }
}

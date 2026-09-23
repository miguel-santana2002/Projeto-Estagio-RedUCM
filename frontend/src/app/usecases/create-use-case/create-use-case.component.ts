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

  rawMitreData: any[] = [];
  mitreAutocompleteList: string[] = [];
  filteredTechniquesList: string[] = [];
  
  baseTacticsList: string[] = [
    "Execution", "Persistence", "Privilege Escalation", "Defense Evasion",
    "Credential Access", "Discovery", "Lateral Movement", "Collection",
    "Exfiltration", "Command and Control", "Impact"
  ];
  allTacticsList: string[] = [...this.baseTacticsList];

  selectedFile: File | null = null;
  errorMessage: string = '';

  createUseCaseForm = new FormGroup({
    title: new FormControl('', Validators.required),
    description: new FormControl(''),
    mitigation: new FormControl(''),
    playbook: new FormControl(''),
    mitreTechniques: new FormControl<any[]>([], Validators.required),
    cncsClass: new FormControl(''),
    cncsType: new FormControl(''),
    tactics: new FormControl<any[]>([], Validators.required),
  });

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

  ngOnInit(): void {
    this.loadMitreTechniques();

    // 1. Táticas selecionadas filtram as técnicas disponíveis
    this.createUseCaseForm.get('tactics')?.valueChanges.subscribe((selectedTactics: any) => {
      if (!selectedTactics || selectedTactics.length === 0) {
        this.filteredTechniquesList = [...this.mitreAutocompleteList];
        return;
      }

      const tacticNames = selectedTactics.map((st: string) => st.split(' - ')[0].trim());

      const filtered = this.rawMitreData.filter((tech: any) => {
        if (!tech.tactics) return false;
        return tech.tactics.some((t: any) => {
          const tName = typeof t === 'string' ? t : t.name;
          return tacticNames.includes(tName);
        });
      });

      this.filteredTechniquesList = filtered.map((t: any) => `${t.id} - ${t.name}`);
    });

    // 2. Técnicas selecionadas geram as táticas correspondentes no formato "Tática - ID"
    this.createUseCaseForm.get('mitreTechniques')?.valueChanges.subscribe((techniques: any) => {
      if (!techniques || techniques.length === 0) {
        return;
      }

      const techniqueIds = techniques.map((t: any) => {
        const val = typeof t === 'string' ? t : (t?.display || t?.value || '');
        return val.split(' - ')[0].trim();
      }).filter((id: string) => id.length > 0);

      if (techniqueIds.length > 0) {
        const generatedTactics: string[] = [];

        techniqueIds.forEach((techId: string) => {
          const techObj = this.rawMitreData.find((item: any) => item.id === techId);
          if (techObj && techObj.tactics) {
            techObj.tactics.forEach((tacticObj: any) => {
              const tacticName = typeof tacticObj === 'string' ? tacticObj : tacticObj.name;
              const formatted = `${tacticName} - ${techId}`;
              if (!generatedTactics.includes(formatted)) {
                generatedTactics.push(formatted);
              }
            });
          }
        });

        if (generatedTactics.length > 0) {
          this.allTacticsList = Array.from(new Set([...this.baseTacticsList, ...generatedTactics]));
          const currentTactics = this.createUseCaseForm.get('tactics')?.value || [];
          const isSame = JSON.stringify(currentTactics.sort()) === JSON.stringify(generatedTactics.sort());
          
          if (!isSame) {
            this.createUseCaseForm.get('tactics')?.setValue(generatedTactics, { emitEvent: false });
          }
        }
      }
    });
  }

  loadMitreTechniques(): void {
    this.mitreService.getAllTechniques().subscribe({
      next: (data: any[]) => {
        this.rawMitreData = data || [];
        this.mitreAutocompleteList = this.rawMitreData.map((t: any) => `${t.id} - ${t.name}`);
        // Garante que a lista filtrada fica logo pronta para abrir o dropdown de imediato
        this.filteredTechniquesList = [...this.mitreAutocompleteList];
      },
      error: (error) => {
        console.error('Erro ao carregar técnicas MITRE:', error);
      },
    });
  }

  updateCNCSValues(): void {
    this.selectedCategory = this.createUseCaseForm.get('cncsClass')?.value || '';
    this.selectedCategoryValues =
      this.taxonomiaCNCS.find((entry: { [x: string]: any }) => entry[this.selectedCategory])?.[this.selectedCategory] || [];
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

    if (useCase.mitreTechniques != null) {
      useCase.mitreTechniques = useCase.mitreTechniques.map((technique: any) => {
        let val = technique?.display || technique?.value || technique?.name || (typeof technique === 'string' ? technique : technique?.id);
        if (typeof val === 'string') {
          val = val.trim();
          if (!val.includes(' - ')) {
            const match = this.mitreAutocompleteList.find((item: string) => item.startsWith(val + ' - ') || item === val);
            if (match) val = match;
          }
        }
        return val;
      });
    }

    if (useCase.tactics != null) {
      useCase.tactics = useCase.tactics.map((tactic: any) => tactic?.value || tactic?.display || tactic?.id || tactic);
    }

    const useCaseData = new FormData();
    useCaseData.append('title', useCase.title);
    useCaseData.append('description', useCase.description);
    useCaseData.append('mitigation', useCase.mitigation);
    useCaseData.append('cncsClass', useCase.cncsClass);
    useCaseData.append('cncsType', useCase.cncsType);

    if (this.selectedFile) {
      useCaseData.append('playbook', this.selectedFile);
    }

    useCaseData.append('mitreTechniques', JSON.stringify(useCase.mitreTechniques));
    useCaseData.append('tactics', JSON.stringify(useCase.tactics));
    useCaseData.append('rules', JSON.stringify(useCase.rules));
    useCaseData.append('phaseTasks', JSON.stringify(useCase.phaseTasks));

    this.usecasesService.createUseCase(useCaseData).subscribe({
      next: () => {
        this.router.navigate(['/manage-usecases']);
      },
      error: (error) => {
        console.error('Erro ao criar o Use Case:', error);
        this.errorMessage = error.error?.detail || error.error?.error || error.error?.message || 'Erro ao criar Use Case no servidor.';
      },
    });
  }
}
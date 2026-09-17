import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TagInputModule } from 'ngx-chips';
import {
  CodeEditorComponent,
  CodeEditorModule,
  CodeModel,
  CodeModelChangedEvent,
} from '@ngstack/code-editor';

import { RulesService } from '../../services/rules.service';
import { UsecasesService } from '../../services/usecases.service';
import { HeaderComponent } from '../../layout/header/header.component';
import { TitlebannerComponent } from '../../layout/titlebanner/titlebanner.component';

@Component({
  selector: 'app-edit-rule-model',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    TagInputModule,
    CodeEditorModule,
    HeaderComponent,
    TitlebannerComponent,
  ],
  templateUrl: './edit-rule-model.component.html',
  styleUrl: './edit-rule-model.component.css',
})
export class EditRuleModelComponent implements OnInit {
  ruleModelId!: number;
  isLoading: boolean = true;

  usecases: any = [];
  registeredLogsources: string[] = [];

  types: { [key: string]: string[] } = {
    SIEM: [
      'AQL (QRadar)',
      'SPL (Splunk)',
      'SPL2 (Splunk)',
      'KQL (Sentinel)',
      'EQL (Elastic)',
      'Sigma Rule',
    ],
    EDR: ['CQL (CrowdStrike)'],
    SOAR: ['YARA Rule'],
  };

  selectedType: string = 'SIEM';
  selectedSyntax: string = 'AQL (QRadar)';
  selectedUseCase: any = '';

  editRuleModelForm = new FormGroup({
    title: new FormControl('', Validators.required),
    selectedUseCase: new FormControl<any>('', Validators.required),
    selectedType: new FormControl('SIEM', Validators.required),
    syntax: new FormControl('AQL (QRadar)', Validators.required),
    logsources: new FormControl<any>(null, Validators.required),
  });

  options = {
    language: 'sql',
    minimap: { enabled: true },
    automaticLayout: true,
    dragAndDrop: true,
  };

  selectedModel: CodeModel = {
    value: '',
    language: 'sql',
    uri: 'rule-model-edit-editor',
  };

  theme = 'vs';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rulesService: RulesService,
    private useCasesService: UsecasesService,
  ) {}

  ngOnInit(): void {
    this.ruleModelId = Number(this.route.snapshot.paramMap.get('id'));

    // Carregar Use Cases e Logsources
    this.useCasesService.getUseCases().subscribe((data) => {
      this.usecases = data;
      this.rulesService.getRegisteredLogSources().subscribe((res: any) => {
        this.registeredLogsources = res.map((log: any) => log.name);
      });
    });

    // Carregar dados existentes do modelo
    this.rulesService.getRuleModelById(this.ruleModelId).subscribe({
      next: (data: any) => {
        this.selectedUseCase = data.useCaseId || data.useCase || '';
        this.selectedType = data.type || 'SIEM';
        this.selectedSyntax = data.syntax || 'AQL (QRadar)';

        const formattedLogs = Array.isArray(data.logsources)
          ? data.logsources.map((l: any) =>
              typeof l === 'string' ? { display: l, value: l } : l,
            )
          : [];

        this.editRuleModelForm.patchValue({
          title: data.title,
          selectedUseCase: this.selectedUseCase,
          selectedType: this.selectedType,
          syntax: this.selectedSyntax,
          logsources: formattedLogs,
        });

        const lang = this.getMonacoLanguage(this.selectedSyntax);
        this.options.language = lang;
        this.selectedModel = {
          value: data.ruleCode || '',
          language: lang,
          uri: `rule-model-edit-${this.ruleModelId}`,
        };

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar modelo de regra:', err);
        this.isLoading = false;
      },
    });
  }

  typeKeys(): string[] {
    return Object.keys(this.types);
  }

  getAvailableSyntaxes(): string[] {
    return this.types[this.selectedType] || [];
  }

  onTypeChange(): void {
    const syntaxes = this.getAvailableSyntaxes();
    if (syntaxes.length > 0) {
      this.selectedSyntax = syntaxes[0];
      this.editRuleModelForm.patchValue({ syntax: this.selectedSyntax });
      this.updateEditorLanguage(this.selectedSyntax);
    }
  }

  onSyntaxChange(): void {
    this.updateEditorLanguage(this.selectedSyntax);
  }

  updateEditorLanguage(syntax: string): void {
    const lang = this.getMonacoLanguage(syntax);
    this.options.language = lang;
    this.selectedModel = {
      ...this.selectedModel,
      language: lang,
    };
  }

  getMonacoLanguage(syntax: string): string {
    switch (syntax) {
      case 'AQL (QRadar)':
      case 'SPL (Splunk)':
      case 'SPL2 (Splunk)':
      case 'KQL (Sentinel)':
      case 'CQL (CrowdStrike)':
        return 'sql';
      default:
        return 'yaml';
    }
  }

  onEditorLoaded(editor: CodeEditorComponent): void {}

  onCodeModelChanged(event: CodeModelChangedEvent): void {
    setTimeout(() => {
      event.sender.formatDocument();
    }, 100);
  }

  onCodeChanged(value: any): void {
    this.selectedModel.value = value;
  }

  updateRuleModel(): void {
    if (this.editRuleModelForm.invalid) {
      return;
    }

    const arrayLogsources: any = this.editRuleModelForm.value.logsources;
    const logsources = arrayLogsources?.map((logsource: any) =>
      typeof logsource === 'string' ? logsource : logsource.value,
    );

    const payload = {
      title: this.editRuleModelForm.value.title,
      useCaseId: this.editRuleModelForm.value.selectedUseCase,
      type: this.editRuleModelForm.value.selectedType,
      syntax: this.editRuleModelForm.value.syntax,
      ruleCode: this.selectedModel.value,
      logsources: logsources,
    };

    this.rulesService.updateRuleModel(this.ruleModelId, payload).subscribe({
      next: () => {
        this.router.navigate(['/ruleModelDetails', this.ruleModelId]);
      },
      error: (err) => console.error('Erro ao atualizar modelo de regra:', err),
    });
  }
}

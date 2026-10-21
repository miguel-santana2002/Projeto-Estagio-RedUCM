import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { HeaderComponent } from '../../../layout/header/header.component';
import { TitlebannerComponent } from '../../../layout/titlebanner/titlebanner.component';
import { AppCodeEditorComponent } from '../../../shared/components/app-code-editor/app-code-editor.component';
import { TagComboboxComponent } from '../../../shared/components/tag-combobox/tag-combobox.component';
import { RulesService } from '../../../services/rules.service';
import { UsecasesService } from '../../../services/usecases.service';

@Component({
  selector: 'app-edit-rule',
  standalone: true,
  templateUrl: './edit-rule.component.html',
  styleUrl: './edit-rule.component.css',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    HeaderComponent,
    TitlebannerComponent,
    AppCodeEditorComponent,
    TagComboboxComponent,
  ],
})
export class EditRuleComponent implements OnInit {
  ruleId!: number;
  rule: any = null;
  isLoading: boolean = true;
  code: string = '';
  isLogsourceOpen: boolean = false;
  usecases: any[] = [];

  typeSyntaxes: { [key: string]: string[] } = {
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
  selectedSyntax: string = 'Sigma Rule';

  statusOptions = [
    { value: '', label: '(Vazio)' },
    { value: 'Regra validada', label: 'Regra validada' },
    { value: 'Regra não validada', label: 'Regra não validada' },
  ];

  clients: any[] = [];
  registeredLogsources: string[] = [];

  editRuleForm = new FormGroup({
    title: new FormControl('', [
      Validators.required,
      Validators.maxLength(255),
    ]),
    selectedUseCase: new FormControl<any>('', Validators.required),
    client: new FormControl<number | null>(null),
    status: new FormControl(''),
    selectedType: new FormControl('SIEM'),
    syntax: new FormControl('Sigma Rule', [
      Validators.required,
      Validators.maxLength(100),
    ]),
    logsources: new FormControl<string[]>([]),
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rulesService: RulesService,
    private useCasesService: UsecasesService,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.ruleId = Number(this.route.snapshot.params['id']);
    this.loadAuxiliaryData();
    this.loadRuleData();
  }

  typeKeys(): string[] {
    return Object.keys(this.typeSyntaxes);
  }

  getAvailableSyntaxes(): string[] {
    return this.typeSyntaxes[this.selectedType] || [];
  }

  onTypeChange(): void {
    const syntaxes = this.getAvailableSyntaxes();
    this.selectedSyntax = syntaxes[0] || '';
    this.editRuleForm.patchValue({ syntax: this.selectedSyntax });
  }

  onSyntaxChange(): void {
    this.editRuleForm.patchValue({ syntax: this.selectedSyntax });
  }

  onCodeChanged(newCode: string): void {
    this.code = newCode;
  }

  toggleLogsourceSelection(option: string, event: Event): void {
    event.stopPropagation();
    const current = this.editRuleForm.value.logsources || [];
    let newVal = [...current];

    const index = newVal.indexOf(option);
    if (index > -1) {
      newVal.splice(index, 1);
    } else {
      newVal.push(option);
    }

    this.editRuleForm.patchValue({ logsources: newVal });
  }

  getSelectedLogsourcesText(): string {
    const selected = this.editRuleForm.value.logsources;
    if (!selected || selected.length === 0) return 'Selecione as Log Sources';
    return selected.join(', ');
  }

  loadAuxiliaryData(): void {
    // 1. LogSources registadas
    this.rulesService.getRegisteredLogSources().subscribe({
      next: (data: any[]) => {
        this.registeredLogsources = data.map((ls: any) => ls.name);
      },
      error: (err) => console.error('Erro ao obter log sources:', err),
    });

    // 2. Empresas / Clientes
    this.http.get<any[]>('/api/accounts/getCompanies').subscribe({
      next: (data: any[]) => {
        this.clients = data || [];
      },
      error: (err) => {
        console.error('Erro ao carregar clientes:', err);
        this.clients = [];
      },
    });

    // 3. Use Cases
    this.useCasesService.getUseCases().subscribe({
      next: (data: any[]) => {
        this.usecases = data || [];
      },
      error: (err) => {
        console.error('Erro ao carregar Use Cases:', err);
        this.usecases = [];
      },
    });
  }

  loadRuleData(): void {
    this.rulesService.getRuleById(this.ruleId).subscribe({
      next: (rule: any) => {
        this.rule = rule;
        this.code = rule.ruleCode || '';

        this.selectedSyntax = rule.syntax || 'Sigma Rule';
        for (const [type, syntaxes] of Object.entries(this.typeSyntaxes)) {
          if (syntaxes.includes(this.selectedSyntax)) {
            this.selectedType = type;
            break;
          }
        }

        const flatLogsources = rule.logsources || [];

        let ruleStatus = (rule.status || '').trim();
        if (ruleStatus.toLowerCase() === 'regra nao validada') {
          ruleStatus = 'Regra não validada';
        }

        const ruleTitle = rule.title || rule.ruleModel?.title || '';
        const ruleUseCase = rule.useCaseId || rule.ruleModel?.useCaseId || '';

        this.editRuleForm.patchValue({
          title: ruleTitle,
          selectedUseCase: ruleUseCase,
          client: rule.client?.pk || rule.client?.id || rule.client || null,
          status: ruleStatus,
          selectedType: rule.type || this.selectedType,
          syntax: this.selectedSyntax,
          logsources: flatLogsources,
        });

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar regra:', err);
        this.isLoading = false;
      },
    });
  }

  updateRule(): void {
    if (this.editRuleForm.invalid) return;

    const formValues = this.editRuleForm.value;

    const payload = {
      title: formValues.title,
      useCaseId: formValues.selectedUseCase
        ? Number(formValues.selectedUseCase)
        : null,
      type: formValues.selectedType || this.selectedType,
      client: formValues.client || null,
      status: formValues.status || '',
      syntax: formValues.syntax,
      logsources: formValues.logsources || [],
      ruleCode: this.code,
    };

    this.rulesService.updateRule(this.ruleId, payload).subscribe({
      next: () => {
        this.router.navigate(['/rule-Details', this.ruleId]);
      },
      error: (err: any) => console.error('Erro ao atualizar regra:', err),
    });
  }
}

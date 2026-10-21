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

import { HeaderComponent } from '../../../layout/header/header.component';
import { TitlebannerComponent } from '../../../layout/titlebanner/titlebanner.component';
import { AppCodeEditorComponent } from '../../../shared/components/app-code-editor/app-code-editor.component';
import { TagComboboxComponent } from '../../../shared/components/tag-combobox/tag-combobox.component';
import { UsecasesService } from '../../../services/usecases.service';
import { RulesService } from '../../../services/rules.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-create-rule',
  standalone: true,
  templateUrl: './create-rule.component.html',
  styleUrl: './create-rule.component.css',
  imports: [
    HeaderComponent,
    TitlebannerComponent,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    AppCodeEditorComponent,
    TagComboboxComponent,
  ],
})
export class CreateRuleComponent implements OnInit {
  usecases: any[] = [];
  clients: any[] = [];
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
  generateSigma: boolean = true;
  forceSigma: boolean = false;

  code: string = '';
  examplePlaceholder: string = '';
  isAutoDetecting = false;
  message: string = '';

  statusOptions = [
    { value: '', label: '(Vazio)' },
    { value: 'Regra validada', label: 'Regra validada' },
    { value: 'Regra não validada', label: 'Regra não validada' },
  ];

  createRuleForm = new FormGroup({
    title: new FormControl('', Validators.required),
    selectedUseCase: new FormControl<any>('', Validators.required),
    client: new FormControl<number | null>(null),
    status: new FormControl('Regra não validada'),
    selectedType: new FormControl('SIEM'),
    syntax: new FormControl('AQL (QRadar)', Validators.required),
    logsources: new FormControl<string[]>([]),
  });

  examples: { [key: string]: string } = {
    'AQL (QRadar)': `SELECT QIDNAME(qid) as "Event Name", sourceip, destinationip, count(*) as "Event Count"
FROM events
WHERE qid = 28250001
GROUP BY sourceip
ORDER BY "Event Count" DESC
LAST 24 HOURS`,

    'SPL (Splunk)': `index=* sourcetype=WinEventLog:Security EventCode=4625
| stats count by Account_Name, Workstation_Name, Source_Network_Address
| where count > 5`,

    'SPL2 (Splunk)': `$data = from _internal
| where status >= 400
| stats count() by status, host
| into $target_dataset;`,

    'KQL (Sentinel)': `SecurityEvent
| where TimeGenerated > ago(1h)
| where EventID == 4625
| summarize FailedLogins = count() by Account, Computer, IpAddress
| where FailedLogins > 5`,

    'EQL (Elastic)': `sequence by process.entity_id with maxspan=1m
  [process where event.type == "start" and process.name == "cmd.exe"]
  [process where event.type == "start" and process.name == "whoami.exe"]`,

    'CQL (CrowdStrike)': `#event_simpleName=ProcessRollup2
| in(FileName, ["powershell.exe", "cmd.exe"])
| CommandLine=/.*-enc.*/i
| groupBy([ComputerName, UserName], function=count())`,

    'Sigma Rule': `title: Execução Suspeita de Linha de Comandos
status: experimental
description: Deteção genérica de ferramentas de reconhecimento
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        EventID: 4688
        CommandLine|contains: 'whoami'
    condition: selection
level: medium`,

    'YARA Rule': `rule Suspicious_Process_Execution {
    strings:
        $s1 = "powershell -enc" nocase
        $s2 = "cmd.exe /c" nocase
    condition:
        any of them
}`,
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private useCasesService: UsecasesService,
    private rulesService: RulesService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    // Carregar clientes
    this.authService.getClients().subscribe({
      next: (clientsData: any) => {
        this.clients = clientsData || [];
      },
      error: (err) => console.error('Erro ao carregar clientes:', err),
    });

    // Carregar log sources registadas
    this.rulesService.getRegisteredLogSources().subscribe({
      next: (res: any) => {
        this.registeredLogsources = res.map((log: any) => log.name);
      },
      error: (err) => console.error('Erro ao carregar log sources:', err),
    });

    // Carregar Use Cases
    this.useCasesService.getUseCases().subscribe({
      next: (data: any) => {
        this.usecases = data || [];

        // Verificar se foi passado queryParam 'useCaseId'
        const paramUcId = this.route.snapshot.queryParams['useCaseId'];
        if (paramUcId) {
          const matchedUc = this.usecases.find(
            (item: any) => item.id === Number(paramUcId),
          );
          if (matchedUc) {
            this.selectedUseCase = matchedUc.id;
            this.createRuleForm.patchValue({ selectedUseCase: matchedUc.id });
            this.onUseCaseChange();
          }
        }
      },
      error: (err) => console.error('Erro ao carregar Use Cases:', err),
    });

    this.applyExampleCode(this.selectedSyntax);
  }

  typeKeys(): string[] {
    return Object.keys(this.types);
  }

  getAvailableSyntaxes(): string[] {
    return this.types[this.selectedType] || [];
  }

  onUseCaseChange(): void {
    const rawVal =
      this.createRuleForm.get('selectedUseCase')?.value ?? this.selectedUseCase;
    const selectedId = Number(rawVal);
    const uc = this.usecases.find((item: any) => item.id === selectedId);

    if (uc) {
      // Usar o valor raw (sem trim) para que "UCName - " não perca o espaço final
      // antes de ser comparado com o padrão de prefixo "UCName - "
      const rawTitle: string = this.createRuleForm.get('title')?.value || '';
      const newPrefix = `${uc.title.trim()} - `;

      if (!rawTitle.trim()) {
        // Campo vazio: preenche com o prefixo do Use Case
        this.createRuleForm.patchValue({ title: newPrefix });
      } else {
        // Ordenar Use Cases do título mais longo para o mais curto para evitar
        // falsos positivos em casos onde um UC é substring de outro
        const sortedUcs = [...this.usecases]
          .filter((u: any) => u.title && u.title.trim() !== '')
          .sort((a, b) => b.title.trim().length - a.title.trim().length);

        // Pesquisa no rawTitle (sem trim) para que "UCName - " com espaço seja detetado
        const matchingUc = sortedUcs.find((u: any) => {
          const prefix = `${u.title.trim()} - `;
          return rawTitle.toLowerCase().startsWith(prefix.toLowerCase());
        });

        if (matchingUc) {
          // Substitui apenas o prefixo, preservando o sufixo escrito pelo utilizador
          const oldPrefix = `${matchingUc.title.trim()} - `;
          const suffix = rawTitle.slice(oldPrefix.length);
          const newTitle = suffix.trim() ? `${newPrefix}${suffix}` : newPrefix;
          this.createRuleForm.patchValue({ title: newTitle });
        } else {
          // Sem prefixo de UC reconhecido: coloca o novo prefixo à frente
          this.createRuleForm.patchValue({
            title: `${newPrefix}${rawTitle.trim()}`,
          });
        }
      }

      const temRegras = uc.rules && uc.rules.length > 0;
      if (!temRegras) {
        this.forceSigma = true;
        this.generateSigma = true;
      } else {
        this.forceSigma = false;
        this.generateSigma = false;
      }
    }
  }

  useExampleCode(): void {
    if (this.examplePlaceholder) {
      this.code = this.examplePlaceholder;
    }
  }

  onTypeChange(): void {
    const syntaxes = this.getAvailableSyntaxes();
    if (syntaxes.length > 0) {
      this.selectedSyntax = syntaxes[0];
      this.createRuleForm.patchValue({ syntax: this.selectedSyntax });
      this.applyExampleCode(this.selectedSyntax);
    }
  }

  onSyntaxChange(): void {
    this.applyExampleCode(this.selectedSyntax);
  }

  applyExampleCode(syntax: string): void {
  if (this.isAutoDetecting) return;
  this.examplePlaceholder = this.examples[syntax] || '';
  this.code = '';
}

  onCodeChanged(value: string): void {
    this.code = value;

    if (this.isAutoDetecting || !value || value.trim() === '') return;

    const lowerCode = value.trim().toLowerCase();
    let detectedType = '';
    let detectedSyntax = '';

    // Motor de Deteção Heurística
    if (
      lowerCode.startsWith('rule ') ||
      (lowerCode.includes('strings:') && lowerCode.includes('condition:'))
    ) {
      detectedType = 'SOAR';
      detectedSyntax = 'YARA Rule';
    } else if (
      lowerCode.includes('title:') &&
      lowerCode.includes('logsource:') &&
      lowerCode.includes('detection:')
    ) {
      detectedType = 'SIEM';
      detectedSyntax = 'Sigma Rule';
    } else if (
      lowerCode.includes('sequence by') ||
      lowerCode.includes('[process where')
    ) {
      detectedType = 'SIEM';
      detectedSyntax = 'EQL (Elastic)';
    } else if (
      lowerCode.includes('index=') ||
      lowerCode.includes('sourcetype=')
    ) {
      detectedType = 'SIEM';
      detectedSyntax = 'SPL (Splunk)';
    } else if (
      lowerCode.includes('| summarize') ||
      lowerCode.includes('| project') ||
      lowerCode.includes('timegenerated > ago')
    ) {
      detectedType = 'SIEM';
      detectedSyntax = 'KQL (Sentinel)';
    } else if (
      lowerCode.includes('#event_simplename') ||
      lowerCode.includes('groupby([')
    ) {
      detectedType = 'EDR';
      detectedSyntax = 'CQL (CrowdStrike)';
    } else if (
      lowerCode.startsWith('select ') &&
      lowerCode.includes('from ') &&
      lowerCode.includes('where ')
    ) {
      detectedType = 'SIEM';
      detectedSyntax = 'AQL (QRadar)';
    }

    if (
      detectedType &&
      detectedSyntax &&
      detectedSyntax !== this.selectedSyntax
    ) {
      this.isAutoDetecting = true;
      this.selectedType = detectedType;
      this.selectedSyntax = detectedSyntax;

      this.createRuleForm.patchValue(
        {
          selectedType: detectedType,
          syntax: detectedSyntax,
        },
        { emitEvent: false },
      );

      setTimeout(() => {
        this.isAutoDetecting = false;
      }, 100);
    }
  }

  createRule(): void {
    if (this.createRuleForm.invalid) return;

    const formValues = this.createRuleForm.value;
    const arrayLogsources: any = formValues.logsources;
    const logsources = Array.isArray(arrayLogsources)
      ? arrayLogsources.map((l: any) => (typeof l === 'string' ? l : l.value || l.display))
      : [];

    const useCaseId = Number(formValues.selectedUseCase);
    const syntax = formValues.syntax || this.selectedSyntax;
    const willGenerateSigma = this.generateSigma && syntax !== 'Sigma Rule';

    const payload = {
      title: formValues.title,
      useCaseId,
      client: formValues.client || null,
      status: formValues.status || '',
      type: formValues.selectedType || this.selectedType,
      syntax,
      ruleCode: this.code,
      logsources,
      generate_sigma: willGenerateSigma,
    };

    this.rulesService.createRule(payload).subscribe({
      next: (res: any) => {
        this.message = willGenerateSigma
          ? 'Regra criada com sucesso. A redirecionar para o caso de uso para acompanhar a geração Sigma...'
          : 'Regra criada com sucesso!';
        setTimeout(() => {
          if (useCaseId) {
            this.router.navigate(['/usecase-Details', useCaseId]);
          } else if (res?.id) {
            this.router.navigate(['/rule-Details', res.id]);
          } else {
            this.router.navigate(['/manage-rules']);
          }
        }, 1500);
      },
      error: (err) => console.error('Erro ao criar regra:', err),
    });
  }

  get isExampleCode(): boolean {
    const exampleVal = this.examples[this.selectedSyntax] || '';
    const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();

    return (
      this.code.trim() !== '' && normalize(this.code) === normalize(exampleVal)
    );
  }
}


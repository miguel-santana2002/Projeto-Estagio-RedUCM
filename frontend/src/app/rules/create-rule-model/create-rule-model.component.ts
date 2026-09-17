import { Component, OnInit } from '@angular/core';
import { HeaderComponent } from '../../layout/header/header.component';
import { TitlebannerComponent } from '../../layout/titlebanner/titlebanner.component';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  CodeEditorComponent,
  CodeEditorModule,
  CodeModel,
  CodeModelChangedEvent,
} from '@ngstack/code-editor';
import { UsecasesService } from '../../services/usecases.service';
import { RulesService } from '../../services/rules.service';
import { TagInputModule } from 'ngx-chips';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-rule-model',
  standalone: true,
  templateUrl: './create-rule-model.component.html',
  styleUrl: './create-rule-model.component.css',
  imports: [
    HeaderComponent,
    TitlebannerComponent,
    CommonModule,
    TagInputModule,
    FormsModule,
    ReactiveFormsModule,
    CodeEditorModule,
  ],
})
export class CreateRuleModelComponent implements OnInit {
  usecases: any = [];
  registeredLogsources: string[] = [];

  // Categorização atualizada incluindo as novas sintaxes
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

  isAutoDetecting = false;

  createRuleModelForm = new FormGroup({
    title: new FormControl('', Validators.required),
    selectedUseCase: new FormControl('', Validators.required),
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
    uri: 'rule-model-editor',
  };

  theme = 'vs';

  constructor(
    private useCasesService: UsecasesService,
    private rulesService: RulesService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.useCasesService.getUseCases().subscribe((data) => {
      this.usecases = data;
      this.rulesService.getRegisteredLogSources().subscribe((res: any) => {
        this.registeredLogsources = res.map((log: any) => log.name);
      });
    });

    this.applyExampleCode(this.selectedSyntax);
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
      this.createRuleModelForm.patchValue({ syntax: this.selectedSyntax });
      this.applyExampleCode(this.selectedSyntax);
    }
  }

  onSyntaxChange(): void {
    this.applyExampleCode(this.selectedSyntax);
  }

  applyExampleCode(syntax: string): void {
    if (this.isAutoDetecting) return;

    const lang = this.getMonacoLanguage(syntax);
    this.options.language = lang;
    this.selectedModel = {
      ...this.selectedModel,
      value: this.examples[syntax] || '',
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

  onCodeChanged(value: string): void {
    // 1. Previne a auto-deteção se for apenas o utilizador a carregar os exemplos predefinidos
    if (this.isAutoDetecting) return;
    if (!value || value.trim() === '') return;

    // Remove case-sensitivity para a análise
    const code = value.trim().toLowerCase();

    let detectedType = '';
    let detectedSyntax = '';

    // 2. Motor de Regras de Deteção (Ordem de especificidade importa)
    if (
      code.startsWith('rule ') ||
      (code.includes('strings:') && code.includes('condition:'))
    ) {
      detectedType = 'SOAR';
      detectedSyntax = 'YARA Rule';
    } else if (
      code.includes('title:') &&
      code.includes('logsource:') &&
      code.includes('detection:')
    ) {
      detectedType = 'SIEM';
      detectedSyntax = 'Sigma Rule';
    } else if (
      code.includes('sequence by') ||
      code.includes('[process where')
    ) {
      detectedType = 'SIEM';
      detectedSyntax = 'EQL (Elastic)';
    } else if (code.includes('index=') || code.includes('sourcetype=')) {
      detectedType = 'SIEM';
      detectedSyntax = 'SPL (Splunk)';
    } else if (
      code.includes('$data =') ||
      code.includes('into $target_dataset;')
    ) {
      detectedType = 'SIEM';
      detectedSyntax = 'SPL2 (Splunk)';
    } else if (
      code.includes('| summarize') ||
      code.includes('| project') ||
      code.includes('timegenerated > ago')
    ) {
      detectedType = 'SIEM';
      detectedSyntax = 'KQL (Sentinel)';
    } else if (
      code.includes('#event_simplename') ||
      code.includes('groupby([')
    ) {
      detectedType = 'EDR';
      detectedSyntax = 'CQL (CrowdStrike)';
    } else if (
      code.startsWith('select ') &&
      code.includes('from ') &&
      code.includes('where ')
    ) {
      detectedType = 'SIEM';
      detectedSyntax = 'AQL (QRadar)';
    }

    // 3. Aplicação Segura ao Formulário
    if (
      detectedType &&
      detectedSyntax &&
      detectedSyntax !== this.selectedSyntax
    ) {
      // Bloqueia a reinjeção de código do applyExampleCode
      this.isAutoDetecting = true;

      // Atualiza o Reactive Form e as variáveis NgModel associadas ao UI
      this.selectedType = detectedType;
      this.selectedSyntax = detectedSyntax;

      this.createRuleModelForm.patchValue(
        {
          selectedType: detectedType,
          syntax: detectedSyntax,
        },
        { emitEvent: false }, // Evita que isto dispare validações ciclicas infinitas
      );

      // Ajusta o Syntax Highlighting do Editor (SQL, YAML, JSON)
      this.options.language = this.getMonacoLanguage(detectedSyntax);

      // Liberta o bloqueio após o ciclo de deteção
      setTimeout(() => {
        this.isAutoDetecting = false;
      }, 100);
    }
  }

  createRuleModel(): void {
    if (this.createRuleModelForm.invalid) {
      return;
    }

    const arrayLogsources: any = this.createRuleModelForm.value.logsources;
    const logsources = arrayLogsources?.map((logsource: any) =>
      typeof logsource === 'string' ? logsource : logsource.value,
    );

    const payload = {
      title: this.createRuleModelForm.value.title,
      useCaseId: this.createRuleModelForm.value.selectedUseCase,
      type: this.createRuleModelForm.value.selectedType,
      syntax: this.createRuleModelForm.value.syntax,
      ruleCode: this.selectedModel.value,
      logsources: logsources,
    };

    this.rulesService.createRuleModel(payload).subscribe({
      next: () => {
        this.router.navigate(['/manage-rule-models']);
      },
      error: (err) => console.error('Erro ao criar modelo de regra:', err),
    });
  }

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

  get isExampleCode(): boolean {
    const currentVal = this.selectedModel.value;
    const exampleVal = this.examples[this.selectedSyntax] || '';

    // Função para remover diferenças de formatação (transforma quebras de linha e tabs em espaços simples)
    const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();

    return (
      currentVal.trim() !== '' &&
      normalize(currentVal) === normalize(exampleVal)
    );
  }
}

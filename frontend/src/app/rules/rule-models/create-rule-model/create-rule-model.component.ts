import { Component, OnInit } from '@angular/core';
import { HeaderComponent } from '../../../layout/header/header.component';
import { TitlebannerComponent } from '../../../layout/titlebanner/titlebanner.component';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { UsecasesService } from '../../../services/usecases.service';
import { RulesService } from '../../../services/rules.service';
import { TagInputModule } from 'ngx-chips';
import { Router, RouterModule } from '@angular/router';
import { AppCodeEditorComponent } from '../../../shared/components/app-code-editor/app-code-editor.component';

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
    RouterModule,
    AppCodeEditorComponent,
  ],
})
export class CreateRuleModelComponent implements OnInit {
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

  code: string = '';
  isAutoDetecting = false;

  // Removida obrigatoriedade estrita de logsources
  createRuleModelForm = new FormGroup({
    title: new FormControl('', Validators.required),
    selectedUseCase: new FormControl('', Validators.required),
    selectedType: new FormControl('SIEM'),
    syntax: new FormControl('AQL (QRadar)'),
    logsources: new FormControl<any>([]), // Opcional
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

  onUseCaseChange(): void {
    const selectedId = Number(
      this.createRuleModelForm.get('selectedUseCase')?.value,
    );
    const uc = this.usecases.find((item: any) => item.id === selectedId);

    if (uc) {
      this.createRuleModelForm.patchValue({
        title: `${uc.title} - `,
      });
    }
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
    this.code = this.examples[syntax] || '';
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
      lowerCode.includes('$data =') ||
      lowerCode.includes('into $target_dataset;')
    ) {
      detectedType = 'SIEM';
      detectedSyntax = 'SPL2 (Splunk)';
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

      this.createRuleModelForm.patchValue(
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

  createRuleModel(): void {
    if (this.createRuleModelForm.invalid) {
      return;
    }

    const arrayLogsources: any = this.createRuleModelForm.value.logsources;

    // Tratamento seguro para tags opcionais
    const logsources = Array.isArray(arrayLogsources)
      ? arrayLogsources.map((logsource: any) =>
          typeof logsource === 'string' ? logsource : logsource.value,
        )
      : [];

    const payload = {
      title: this.createRuleModelForm.value.title,
      useCaseId: this.createRuleModelForm.value.selectedUseCase,
      type: this.createRuleModelForm.value.selectedType,
      syntax: this.createRuleModelForm.value.syntax,
      ruleCode: this.code,
      logsources: logsources,
    };

    this.rulesService.createRuleModel(payload).subscribe({
      next: () => {
        this.router.navigate(['/manage-rule-models']);
      },
      error: (err) => console.error('Erro ao criar modelo de regra:', err),
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

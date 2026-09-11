import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Clipboard } from '@angular/cdk/clipboard';

import {
  CodeEditorComponent,
  CodeEditorModule,
  CodeModel,
  CodeModelChangedEvent,
} from '@ngstack/code-editor';

import { RulesService } from '../../services/rules.service';
import { HeaderComponent } from '../../layout/header/header.component';
import { TitlebannerComponent } from '../../layout/titlebanner/titlebanner.component';
import { UsecasesService } from '../../services/usecases.service';
import { AuthService } from '../../services/auth.service';
import { SigmaConversionsService } from '../../services/sigma-conversions.service';

@Component({
  selector: 'app-rule-model-details',
  standalone: true,
  templateUrl: './rule-model-details.component.html',
  styleUrl: './rule-model-details.component.css',
  imports: [
    HeaderComponent,
    TitlebannerComponent,
    CodeEditorModule,
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
  ],
})
export class RuleModelDetailsComponent implements OnInit {
  selectLogsources: any;
  registeredLogsources: any = [];
  code: any = '';
  clients: any = [];
  selectClient: any;
  ruleInstances: any = [];

  user: any = { companies: [] };
  usercompanynames: any = [];

  ruleModel: any = {
    id: null,
    title: '',
    useCaseId: '',
    type: '',
    syntax: '',
    ruleCode: '',
    logsources: [],
  };

  usecase: any = {
    title: '',
    description: '',
    mitreTechniques: [],
  };

  selectedModel: CodeModel = {
    value: '',
    language: 'yaml',
    uri: '',
  };

  theme = 'vs';

  options = {
    language: 'yaml',
    fontSize: 15,
    minimap: { enabled: true },
    automaticLayout: true,
    dragAndDrop: true,
  };

  message: string = '';

  soarSintaxes = ['YARA Rule'];
  siemSintaxes = [
    'AQL (QRadar)',
    'SPL (Splunk)',
    'Sigma Rule',
    'Elastic Lucene Rule',
  ];

  createRuleForm = new FormGroup({
    modalCode: new FormControl(''),
    logsources: new FormControl(null),
    client: new FormControl(''),
    syntax: new FormControl(''),
  });

  constructor(
    private sigmaConversionsService: SigmaConversionsService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private rulesService: RulesService,
    private useCaseService: UsecasesService,
    private clipboard: Clipboard,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];

    this.rulesService.getRuleModelById(id).subscribe({
      next: (data: any) => {
        this.ruleModel = data;

        // 1. Usa a sintaxe persistida no modelo (ou fallback se for registo legado)
        const initialSyntax =
          this.ruleModel.syntax ||
          (this.ruleModel.type === 'SIEM' ? 'AQL (QRadar)' : 'YARA Rule');

        this.ruleModel.syntax = initialSyntax;

        // 2. Ajusta dinamicamente a linguagem de sintaxe do Monaco Editor
        const lang = this.getMonacoLanguage(initialSyntax);
        this.options.language = lang;
        this.selectedModel = {
          value: this.ruleModel.ruleCode || '',
          language: lang,
          uri: `model-${this.ruleModel.id}`,
        };

        // 3. Inicializa o formulário do modal
        this.createRuleForm.patchValue({
          modalCode: this.ruleModel.ruleCode,
          syntax: initialSyntax,
          logsources: this.ruleModel.logsources,
        });

        // 4. Carrega metadados do Use Case associado
        this.loadUseCaseAndDependencies();
      },
      error: (err) => console.error('Erro ao obter modelo de regra:', err),
    });
  }

  loadUseCaseAndDependencies(): void {
    if (!this.ruleModel.useCaseId) return;

    this.useCaseService
      .getUseCaseById(this.ruleModel.useCaseId)
      .subscribe((data: any) => {
        this.usecase = data;

        this.authService.getClients().subscribe((clientData: any) => {
          this.clients = clientData;

          this.rulesService.getRules().subscribe((rulesData: any) => {
            this.ruleInstances = rulesData.filter(
              (rule: any) => rule.ruleModel?.id === this.ruleModel.id,
            );

            this.authService.loggedInInfo().subscribe((userInfo: any) => {
              this.user = userInfo;
              if (!this.user.companies) {
                this.user.companies = [];
              }
              if (this.user.companies.length > 0) {
                this.clients = this.clients.filter((c: any) =>
                  this.user.companies.includes(c.name),
                );
              }
            });
          });
        });
      });
  }

  getMonacoLanguage(syntax: string): string {
    switch (syntax) {
      case 'Elastic Lucene Rule':
        return 'json';
      case 'SPL (Splunk)':
      case 'AQL (QRadar)':
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
    this.code = value;
  }

  copyToClipboard(): void {
    const textToCopy = this.selectedModel.value || this.ruleModel.ruleCode;
    this.clipboard.copy(textToCopy);
    this.message = 'Código copiado com sucesso!';
    setTimeout(() => (this.message = ''), 3000);
  }

  updateRuleModelCode(): void {
    this.rulesService
      .updateRuleModelCode(this.selectedModel.value, this.ruleModel.id)
      .subscribe({
        next: (data: any) => {
          this.message = data.message || 'Regra atualizada com sucesso!';
          this.ruleModel.ruleCode = this.selectedModel.value;
          setTimeout(() => (this.message = ''), 4000);
        },
        error: (err) => console.error('Erro ao atualizar código:', err),
      });
  }

  openAssignModal(): void {
    const currentCode = this.selectedModel.value;
    this.ruleModel.ruleCode = currentCode;

    this.createRuleForm.patchValue({
      modalCode: currentCode,
      syntax: this.ruleModel.syntax,
      logsources: this.ruleModel.logsources,
    });
  }

  onSyntaxChange(): void {
    const selectedSyntax = this.createRuleForm.get('syntax')?.value;
    const baseCode = this.ruleModel.ruleCode;

    if (selectedSyntax === 'Sigma Rule' || selectedSyntax === 'YARA Rule') {
      this.createRuleForm.patchValue({ modalCode: baseCode });
      return;
    }

    let request$;
    switch (selectedSyntax) {
      case 'SPL (Splunk)':
      case 'Splunk Rule':
        request$ = this.sigmaConversionsService.convertSigmaToSplunk(baseCode);
        break;
      case 'AQL (QRadar)':
      case 'QRadar Rule':
        request$ = this.sigmaConversionsService.convertSigmaToQRadar(baseCode);
        break;
      case 'Elastic Lucene Rule':
      case 'Elastic Rule':
        request$ =
          this.sigmaConversionsService.convertSigmaToElasticLucena(baseCode);
        break;
      default:
        this.createRuleForm.patchValue({ modalCode: baseCode });
        return;
    }

    request$.subscribe({
      next: (res: any) => {
        const cleanCode = Array.isArray(res) && res.length > 0 ? res[0] : res;
        this.createRuleForm.patchValue({ modalCode: cleanCode });
      },
      error: (err: any) => {
        const errorMessage =
          err.error?.error || err.statusText || 'Erro na conversão.';
        this.createRuleForm.patchValue({
          modalCode: `Falha na conversão: ${errorMessage}`,
        });
      },
    });
  }

  async createRule(): Promise<void> {
    const formVals = this.createRuleForm.value;

    let clientId = formVals.client;
    if (typeof clientId === 'string') {
      const found = this.clients.find((c: any) => c.name === clientId);
      if (found) clientId = found.pk;
    }

    const rulePayload = {
      ruleModel: this.ruleModel.id,
      ruleCode: formVals.modalCode,
      logsources: formVals.logsources,
      client: clientId,
      syntax: formVals.syntax,
    };

    this.rulesService.createRule(rulePayload).subscribe({
      next: () => {
        this.router.navigate(['/manage-rules']);
      },
      error: (e) => console.error('Erro ao atribuir regra ao cliente:', e),
    });
  }
}

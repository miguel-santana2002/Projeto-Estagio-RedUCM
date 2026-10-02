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

import { CodeModel, CodeModelChangedEvent } from '@ngstack/code-editor';

import { RulesService } from '../../../services/rules.service';
import { HeaderComponent } from '../../../layout/header/header.component';
import { TitlebannerComponent } from '../../../layout/titlebanner/titlebanner.component';
import { UsecasesService } from '../../../services/usecases.service';
import { AuthService } from '../../../services/auth.service';
import { SigmaConversionsService } from '../../../services/sigma-conversions.service';

import { AppCodeEditorComponent } from '../../../shared/components/app-code-editor/app-code-editor.component';

@Component({
  selector: 'app-rule-model-details',
  standalone: true,
  templateUrl: './rule-model-details.component.html',
  styleUrl: './rule-model-details.component.css',
  imports: [
    HeaderComponent,
    TitlebannerComponent,
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    AppCodeEditorComponent,
  ],
})
export class RuleModelDetailsComponent implements OnInit {
  conversionSource: string = '';
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
  isSyntaxConverting: boolean = false;
  syntaxError: string = '';
  private syntaxRequestId = 0;

  soarSintaxes = ['YARA Rule'];

  siemSintaxes = [
    'AQL (QRadar)',
    'SPL (Splunk)',
    'SPL2 (Splunk)',
    'KQL (Sentinel)',
    'EQL (Elastic)',
    'Sigma Rule',
  ];

  edrSintaxes = ['CQL (CrowdStrike)', 'Defender KQL', 'Sigma Rule'];

  availableSyntaxes = [
    { id: 'SPL (Splunk)', name: 'SPL (Splunk)' },
    { id: 'KQL (Sentinel)', name: 'KQL (Sentinel)' },
    { id: 'AQL (QRadar)', name: 'AQL (QRadar)' },
    { id: 'EQL (Elastic)', name: 'EQL (Elastic)' },
    { id: 'CQL (CrowdStrike)', name: 'CQL (CrowdStrike)' },
    { id: 'Sigma Rule', name: 'Sigma Rule' },
  ];

  // Estado da Modal de Conversão
  showConvertModal: boolean = false;
  sourceRuleContent: string = '';
  pysigmaConvertedContent: string = '';
  aiConvertedContent: string = '';
  aiPureConvertedContent: string = '';
  intermediateSigmaContent: string = '';
  conversionEngine: 'pysigma' | 'hybrid' | 'llm' | null = null;
  targetSyntax: string = '';
  isConverting: boolean = false;
  conversionError: string = '';
  selectedOutputView: 'ai' | 'ai_pure' | 'pysigma' = 'ai';

  // Estado do Pop-up (Toast)
  showSuccessToast: boolean = false;
  private toastTimeout: any;

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
    public clipboard: Clipboard,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.params['id']);

    this.rulesService.getRuleModelById(id).subscribe((data: any) => {
      this.ruleModel = data;

      const initialSyntax =
        this.ruleModel.syntax ||
        (this.ruleModel.type === 'SIEM' ? 'AQL (QRadar)' : 'YARA Rule');

      this.ruleModel.syntax = initialSyntax;

      const lang = this.getMonacoLanguage(initialSyntax);
      this.options.language = lang;
      this.selectedModel = {
        value: this.ruleModel.ruleCode || '',
        language: lang,
        uri: `model-${this.ruleModel.id}`,
      };

      this.createRuleForm.patchValue({
        modalCode: this.ruleModel.ruleCode,
        syntax: initialSyntax,
        logsources: this.ruleModel.logsources,
      });

      this.loadUseCaseAndDependencies();
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
      case 'SPL (Splunk)':
      case 'AQL (QRadar)':
      case 'KQL (Sentinel)':
      case 'EQL (Elastic)':
        return 'sql';
      default:
        return 'yaml';
    }
  }

  onCodeModelChanged(event: CodeModelChangedEvent): void {
    setTimeout(() => {
      event.sender.formatDocument();
    }, 100);
  }

  onCodeChanged(value: any): void {
    this.code = value;
    this.selectedModel.value = value;
  }

  copyToClipboard(): void {
    const textToCopy = this.selectedModel.value || this.ruleModel.ruleCode;
    this.clipboard.copy(textToCopy);
    this.message = 'Código copiado com sucesso!';
    setTimeout(() => (this.message = ''), 3000);
  }

  updateRuleModelCode(): void {
    const newCode = this.selectedModel.value;
    const newSyntax = this.ruleModel.syntax;

    this.rulesService
      .updateRuleModelCode(newCode, this.ruleModel.id, newSyntax)
      .subscribe({
        next: (data: any) => {
          this.message = data.message || 'Regra atualizada com sucesso!';
          this.ruleModel.ruleCode = newCode;
          this.ruleModel.syntax = newSyntax;

          this.createRuleForm.patchValue({
            modalCode: newCode,
            syntax: newSyntax,
          });

          setTimeout(() => (this.message = ''), 4000);
        },
        error: (err) =>
          console.error('Erro ao atualizar código e sintaxe:', err),
      });
  }

  openAssignModal(): void {
    this.syntaxRequestId++;
    this.isSyntaxConverting = false;
    this.syntaxError = '';
    const currentCode = this.selectedModel.value;
    this.ruleModel.ruleCode = currentCode;

    this.createRuleForm.patchValue({
      modalCode: currentCode,
      syntax: this.ruleModel.syntax,
      logsources: this.ruleModel.logsources,
    });
  }

  // --- Lógica da Modal de Conversão ---

  openConvertModal(): void {
    this.sourceRuleContent =
      this.selectedModel.value || this.ruleModel.ruleCode || '';
    this.conversionEngine = null;
    this.targetSyntax = '';
    this.isConverting = false;
    this.showConvertModal = true;
  }

  closeConvertModal(): void {
    this.showConvertModal = false;
    this.conversionError = '';
  }

  private doneEngines: { [key: string]: boolean } = {};
  private hasRun = false;

  convertRule(): void {
    this.hasRun = true;
    this.doneEngines = {};
    this.pysigmaConvertedContent = '';
    this.aiConvertedContent = '';
    this.aiPureConvertedContent = '';
    this.intermediateSigmaContent = '';
    this.runEngine(this.selectedOutputView);
  }

  resetConversions(): void {
    this.hasRun = false;
    this.doneEngines = {};
  }

  onOutputViewChange(): void {
    if (
      this.hasRun &&
      this.targetSyntax &&
      !this.doneEngines[this.selectedOutputView]
    ) {
      this.runEngine(this.selectedOutputView);
    }
  }

  private runEngine(engine: 'ai' | 'ai_pure' | 'pysigma'): void {
    this.isConverting = true;
    this.conversionError = '';

    const payload = {
      source_query: this.sourceRuleContent,
      source_syntax: this.ruleModel.syntax,
      target_syntax: this.targetSyntax,
      logsource:
        this.ruleModel.logsources || this.createRuleForm.value.logsources,
      engine: engine,
    };

    this.sigmaConversionsService.convertRuleWithAI(payload).subscribe({
      next: (res: any) => {
        if (engine === 'pysigma')
          this.pysigmaConvertedContent = res.pysigma_result || 'N/A';
        else if (engine === 'ai') this.aiConvertedContent = res.ai_result || '';
        else this.aiPureConvertedContent = res.ai_pure_result || '';

        if (res.sigma_rule) this.intermediateSigmaContent = res.sigma_rule;
        this.doneEngines[engine] = true;
        this.isConverting = false;
      },
      error: (err: any) => {
        this.conversionError =
          err.error?.error ||
          err.message ||
          'Erro durante a conversão da regra.';
        this.isConverting = false;
      },
    });
  }

  applyConvertedRule(): void {
    const finalContent =
      this.selectedOutputView === 'ai'
        ? this.aiConvertedContent
        : this.selectedOutputView === 'ai_pure'
          ? this.aiPureConvertedContent
          : this.pysigmaConvertedContent;

    if (!finalContent) return;

    this.createRuleForm.patchValue({
      modalCode: finalContent,
      syntax: this.targetSyntax,
      logsources: this.ruleModel.logsources,
      client: null,
    });

    this.closeConvertModal();
    this.createRule();
  }

  // --- Lógica do Pop-up (Toast) ---

  showToast(): void {
    this.showSuccessToast = true;
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.showSuccessToast = false;
    }, 10000);
  }

  closeToast(): void {
    this.showSuccessToast = false;
    clearTimeout(this.toastTimeout);
  }

  // --- Fim da Modal de Conversão ---

  onSyntaxChange(): void {
    const selectedSyntax = this.createRuleForm.get('syntax')?.value;
    const baseCode = this.ruleModel.ruleCode;
    const baseSyntax = this.ruleModel.syntax;

    this.syntaxError = '';
    const requestId = ++this.syntaxRequestId;

    if (!selectedSyntax || selectedSyntax === baseSyntax) {
      this.isSyntaxConverting = false;
      this.createRuleForm.patchValue({ modalCode: baseCode });
      return;
    }

    const engine = baseSyntax === 'Sigma Rule' ? 'pysigma' : 'ai_pure';

    const payload = {
      source_query: baseCode,
      source_syntax: baseSyntax,
      target_syntax: selectedSyntax,
      engine: engine,
    };

    this.isSyntaxConverting = true;

    this.sigmaConversionsService.convertRuleWithAI(payload).subscribe({
      next: (res: any) => {
        if (requestId !== this.syntaxRequestId) return;
        const result =
          engine === 'pysigma' ? res.pysigma_result : res.ai_pure_result;
        this.createRuleForm.patchValue({ modalCode: result || baseCode });
        this.isSyntaxConverting = false;
      },
      error: (err: any) => {
        if (requestId !== this.syntaxRequestId) return;
        this.syntaxError = err.error?.error || 'Erro na conversão.';
        this.createRuleForm.patchValue({ modalCode: baseCode });
        this.isSyntaxConverting = false;
      },
    });
  }

  async createRule(): Promise<void> {
    const formVals = this.createRuleForm.value;

    let clientId = formVals.client;
    if (typeof clientId === 'string') {
      const found = this.clients.find((c: any) => c.name === clientId);
      if (found) {
        clientId = found.id ?? found.pk;
      }
    }

    const rulePayload = {
      ruleModel: this.ruleModel.id,
      ruleCode: formVals.modalCode,
      logsources: formVals.logsources,
      client: clientId || null,
      syntax: formVals.syntax,
    };

    this.rulesService.createRule(rulePayload).subscribe({
      next: () => {
        document
          .querySelectorAll('[modal-backdrop]')
          .forEach((el) => el.remove());

        document.body.classList.remove('overflow-hidden');

        // Atualiza as instâncias no fundo do ecrã e abre o pop-up sem redirecionar
        this.loadUseCaseAndDependencies();
        this.showToast();
      },
      error: (e) => console.error('Erro ao atribuir regra ao cliente:', e),
    });
  }
}

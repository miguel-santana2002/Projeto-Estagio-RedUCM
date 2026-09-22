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

import { AppCodeEditorComponent } from '../../shared/components/app-code-editor/app-code-editor.component';

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
    AppCodeEditorComponent,
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
  convertedRuleContent: string = '';
  intermediateSigmaContent: string = '';
  conversionEngine: 'pysigma' | 'hybrid' | 'llm' | null = null;
  targetSyntax: string = '';
  isConverting: boolean = false;
  conversionError: string = '';

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

  onEditorLoaded(editor: CodeEditorComponent): void {}

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
    this.convertedRuleContent = '';
    this.conversionEngine = null;
    this.targetSyntax = '';
    this.isConverting = false;
    this.showConvertModal = true;
  }

  closeConvertModal(): void {
    this.showConvertModal = false;
  }

  convertRule(): void {
    if (!this.targetSyntax || !this.sourceRuleContent) return;

    // Se a sintaxe de destino for igual à atual, não precisa de conversão
    if (this.targetSyntax === this.ruleModel.syntax) {
      this.convertedRuleContent = this.sourceRuleContent;
      return;
    }

    this.isConverting = true;
    this.convertedRuleContent = '';
    this.intermediateSigmaContent = '';
    this.conversionEngine = null;
    this.conversionError = '';

    const payload = {
      source_query: this.sourceRuleContent,
      source_syntax: this.ruleModel.syntax,
      target_syntax: this.targetSyntax,
    };

    this.sigmaConversionsService.convertRuleWithAI(payload).subscribe({
      next: (res: any) => {
        this.convertedRuleContent = res.target_query;
        this.intermediateSigmaContent = res.sigma_rule;
        this.conversionEngine = res.engine || null;
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

  copyConvertedToClipboard(): void {
    if (this.convertedRuleContent) {
      this.clipboard.copy(this.convertedRuleContent);
      this.message = 'Código convertido copiado com sucesso!';
      setTimeout(() => (this.message = ''), 3000);
    }
  }

  applyConvertedRule(): void {
    if (!this.convertedRuleContent || this.isConverting) return;

    const payload = {
      ruleModel: this.ruleModel.id,
      ruleCode: this.convertedRuleContent,
      syntax: this.targetSyntax,
      logsources: this.ruleModel.logsources || [],
      client: null, // Cria a instância sem cliente associado
    };

    this.rulesService.createRule(payload).subscribe({
      next: (createdRule: any) => {
        // 1. Fecha o modal de conversão
        this.closeConvertModal();

        // 2. Adiciona a nova regra à grelha de instâncias no ecrã
        if (createdRule) {
          this.ruleInstances.push(createdRule);
        }

        // 3. Ativa o toast de sucesso
        this.message = `Nova regra (${this.targetSyntax}) criada com sucesso!`;
        setTimeout(() => {
          this.message = '';
        }, 4000);
      },
      error: (err: any) => {
        this.conversionError =
          'Erro ao registar a nova regra na base de dados.';
        console.error('Erro ao criar regra convertida:', err);
      },
    });
  }

  // --- Fim da Modal de Conversão ---

  onSyntaxChange(): void {
    const selectedSyntax = this.createRuleForm.get('syntax')?.value;
    const baseCode = this.ruleModel.ruleCode;
    const baseSyntax = this.ruleModel.syntax;

    if (!selectedSyntax || selectedSyntax === baseSyntax) {
      this.createRuleForm.patchValue({ modalCode: baseCode });
      return;
    }

    const payload = {
      source_query: baseCode,
      source_syntax: baseSyntax,
      target_syntax: selectedSyntax,
    };

    this.sigmaConversionsService.convertRuleWithAI(payload).subscribe({
      next: (res: any) => {
        this.createRuleForm.patchValue({ modalCode: res.target_query });
      },
      error: (err: any) => {
        const errorMsg = err.error?.error || 'Erro na conversão.';
        this.createRuleForm.patchValue({
          modalCode: `Falha ao converter regra: ${errorMsg}`,
        });
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
      client: clientId,
      syntax: formVals.syntax,
    };

    this.rulesService.createRule(rulePayload).subscribe({
      next: () => {
        document
          .querySelectorAll('[modal-backdrop]')
          .forEach((el) => el.remove());

        document.body.classList.remove('overflow-hidden');
        this.router.navigate(['/manage-rules']);
      },
      error: (e) => console.error('Erro ao atribuir regra ao cliente:', e),
    });
  }
}

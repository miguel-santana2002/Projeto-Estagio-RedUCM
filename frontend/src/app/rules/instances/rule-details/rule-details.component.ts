import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Clipboard } from '@angular/cdk/clipboard';

import { RulesService } from '../../../services/rules.service';
import { HeaderComponent } from '../../../layout/header/header.component';
import { TitlebannerComponent } from '../../../layout/titlebanner/titlebanner.component';
import { UsecasesService } from '../../../services/usecases.service';
import { AuthService } from '../../../services/auth.service';
import { SigmaConversionsService } from '../../../services/sigma-conversions.service';
import { AppCodeEditorComponent } from '../../../shared/components/app-code-editor/app-code-editor.component';
import { exportRuleFormatted, ExportFormat } from '../../../shared/utils/rule-export.util';

@Component({
  selector: 'app-rule-details',
  standalone: true,
  templateUrl: './rule-details.component.html',
  styleUrl: './rule-details.component.css',
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
export class RuleDetailsComponent implements OnInit {
  rule: any = { client: { name: 'Sem Cliente' }, ruleModel: {} };
  usecase: any = null;
  code: string = '';
  message: string = '';
  isLoading: boolean = true;

  clients: any[] = [];
  user: any = { username: '', companies: [] };
  childRules: any[] = [];

  // Modal de Conversão
  showConvertModal: boolean = false;
  sourceRuleContent: string = '';
  targetSyntax: string = '';
  isConverting: boolean = false;
  conversionError: string = '';
  selectedOutputView: 'ai' | 'ai_pure' | 'pysigma' = 'ai';
  aiConvertedContent: string = '';
  aiPureConvertedContent: string = '';
  pysigmaConvertedContent: string = '';
  intermediateSigmaContent: string = '';
  showSuccessToast: boolean = false;
  toastTimeout: any = null;
  private doneEngines: { [key: string]: boolean } = {};
  private hasRun = false;

  // Modal de Atribuição a Clientes
  showAssignModal: boolean = false;
  isSyntaxConverting: boolean = false;
  syntaxError: string = '';
  private syntaxRequestId = 0;

  availableSyntaxes = [
    { id: 'SPL (Splunk)', name: 'SPL (Splunk)' },
    { id: 'KQL (Sentinel)', name: 'KQL (Sentinel)' },
    { id: 'AQL (QRadar)', name: 'AQL (QRadar)' },
    { id: 'EQL (Elastic)', name: 'EQL (Elastic)' },
    { id: 'CQL (CrowdStrike)', name: 'CQL (CrowdStrike)' },
    { id: 'Sigma Rule', name: 'Sigma Rule' },
  ];

  assignRuleForm = new FormGroup({
    client: new FormControl<any>(null, Validators.required),
    syntax: new FormControl(''),
    modalCode: new FormControl(''),
  });

  constructor(
    private route: ActivatedRoute,
    private rulesService: RulesService,
    private useCaseService: UsecasesService,
    private authService: AuthService,
    private sigmaConversionsService: SigmaConversionsService,
    public clipboard: Clipboard,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.params['id']);

    this.authService.loggedInInfo().subscribe({
      next: (userInfo: any) => {
        this.user = userInfo || { username: '', companies: [] };
        if (!this.user.companies) this.user.companies = [];
      },
      error: () => {},
    });

    this.authService.getClients().subscribe({
      next: (clientsData: any) => {
        this.clients = clientsData || [];
      },
      error: () => {},
    });

    this.loadRuleData(id);
  }

  loadRuleData(id: number): void {
    this.rulesService.getRuleById(id).subscribe({
      next: (data: any) => {
        const directLogs = Array.isArray(data.logsources)
          ? data.logsources.filter((l: string) => Boolean(l))
          : [];
        const modelLogs = Array.isArray(data.ruleModel?.logsources)
          ? data.ruleModel.logsources.filter((l: string) => Boolean(l))
          : [];
        const effectiveLogs = directLogs.length > 0 ? directLogs : modelLogs;

        this.rule = {
          ...data,
          title: data.title || data.ruleModel?.title || `Regra #${data.id}`,
          client: data.client || { name: 'Sem Cliente' },
          status: data.status || '',
          logsources: effectiveLogs,
        };
        this.code = this.rule.ruleCode || '';

        const effectiveUseCaseId =
          this.rule.useCaseId || this.rule.ruleModel?.useCaseId;

        if (effectiveUseCaseId) {
          this.loadUseCase(Number(effectiveUseCaseId));
        }

        this.loadChildRules(id);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar detalhes da regra:', err);
        this.isLoading = false;
      },
    });
  }

  private loadUseCase(useCaseId: number): void {
    this.useCaseService.getUseCaseById(useCaseId).subscribe({
      next: (ucData: any) => {
        this.usecase = ucData;
      },
      error: (err) => console.error('Erro ao carregar Use Case:', err),
    });
  }

  private loadChildRules(ruleId: number): void {
    const currentId = Number(this.rule?.id || ruleId);
    const parentVal = this.rule?.parent?.id ?? this.rule?.parent;
    const parentId = parentVal ? Number(parentVal) : null;
    const rootParentId = parentId || currentId;

    this.rulesService.getRulesByParent(rootParentId).subscribe({
      next: (children: any[]) => {
        // Exclui a própria regra que está aberta no ecrã e a regra raiz se vier devolvida
        this.childRules = (children || []).filter((r: any) => {
          const rId = Number(r.id);
          return rId !== currentId && (!parentId || rId !== parentId);
        });
      },
      error: (err) => console.error('Erro ao carregar regras secundárias:', err),
    });
  }

  onCodeChanged(value: string): void {
    this.code = value;
  }

  updateRuleCode(): void {
    this.rulesService.updateRuleCode(this.code, this.rule.id).subscribe({
      next: (data: any) => {
        this.message = data?.message || 'Regra atualizada com sucesso!';
        this.rule.ruleCode = this.code;
        setTimeout(() => {
          this.message = '';
        }, 4000);
      },
      error: (err) => {
        console.error('Erro ao atualizar código da regra:', err);
      },
    });
  }

  copyToClipboard(): void {
    const textToCopy = this.code || this.rule.ruleCode || '';
    this.clipboard.copy(textToCopy);
    this.message = 'Código copiado para a área de transferência!';
    setTimeout(() => {
      this.message = '';
    }, 3000);
  }

  exportMenuOpen: boolean = false;

  toggleExportMenu(event?: Event): void {
    if (event) event.stopPropagation();
    this.exportMenuOpen = !this.exportMenuOpen;
  }

  @HostListener('document:click')
  closeExportMenu(): void {
    this.exportMenuOpen = false;
  }

  exportRule(format: ExportFormat = 'yml'): void {
    this.exportMenuOpen = false;
    const content = this.code || this.rule.ruleCode || '';
    exportRuleFormatted(
      this.rule.id,
      this.rule.title || this.rule.ruleModel?.title || 'rule',
      content,
      format
    );
  }

  exportSigmaRule(): void {
    this.exportRule('yml');
  }

  // --- Modal de Conversão ---

  openConvertModal(): void {
    this.sourceRuleContent = this.code || this.rule.ruleCode || '';
    this.targetSyntax = '';
    this.isConverting = false;
    this.conversionError = '';
    this.showConvertModal = true;
  }

  closeConvertModal(): void {
    this.showConvertModal = false;
    this.conversionError = '';
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

  convertRule(): void {
    this.hasRun = true;
    this.doneEngines = {};
    this.pysigmaConvertedContent = '';
    this.aiConvertedContent = '';
    this.aiPureConvertedContent = '';
    this.intermediateSigmaContent = '';
    this.runEngine(this.selectedOutputView);
  }

  private runEngine(engine: 'ai' | 'ai_pure' | 'pysigma'): void {
    this.isConverting = true;
    this.conversionError = '';

    const payload = {
      source_query: this.sourceRuleContent,
      source_syntax: this.rule.syntax,
      target_syntax: this.targetSyntax,
      logsource: this.rule.logsources || [],
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

    // Regra Principal é a raiz para qualquer conversão
    const parentId = this.rule.parent?.id ?? this.rule.parent ?? this.rule.id;

    const payload = {
      title: `${this.rule.title} (${this.targetSyntax})`,
      useCaseId: this.rule.useCaseId || this.rule.ruleModel?.useCaseId,
      type: this.rule.type || 'SIEM',
      syntax: this.targetSyntax,
      ruleCode: finalContent,
      logsources: this.rule.logsources || [],
      client: null,
      parent: parentId,
      status: 'Regra não validada',
      generate_sigma: false,
    };

    this.rulesService.createRule(payload).subscribe({
      next: () => {
        this.closeConvertModal();
        this.showToast();
        this.loadChildRules(this.rule.id);
      },
      error: (err: any) => {
        this.conversionError =
          err.error?.error || 'Erro ao criar regra convertida.';
      },
    });
  }

  // --- Modal de Atribuição a Cliente ---

  openAssignModal(): void {
    this.syntaxRequestId++;
    this.isSyntaxConverting = false;
    this.syntaxError = '';
    const currentCode = this.code || this.rule.ruleCode || '';

    this.assignRuleForm.patchValue({
      client: null,
      syntax: this.rule.syntax,
      modalCode: currentCode,
    });
    this.showAssignModal = true;
  }

  closeAssignModal(): void {
    this.showAssignModal = false;
    this.syntaxError = '';
  }

  onAssignSyntaxChange(): void {
    const selectedSyntax = this.assignRuleForm.get('syntax')?.value;
    const baseCode = this.code || this.rule.ruleCode || '';
    const baseSyntax = this.rule.syntax;

    this.syntaxError = '';
    const requestId = ++this.syntaxRequestId;

    if (!selectedSyntax || selectedSyntax === baseSyntax) {
      this.isSyntaxConverting = false;
      this.assignRuleForm.patchValue({ modalCode: baseCode });
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
        this.assignRuleForm.patchValue({ modalCode: result || baseCode });
        this.isSyntaxConverting = false;
      },
      error: (err: any) => {
        if (requestId !== this.syntaxRequestId) return;
        this.syntaxError = err.error?.error || 'Erro na conversão.';
        this.assignRuleForm.patchValue({ modalCode: baseCode });
        this.isSyntaxConverting = false;
      },
    });
  }

  createAssignedRule(): void {
    if (this.assignRuleForm.invalid) return;

    const formVals = this.assignRuleForm.value;
    let clientId = formVals.client;
    if (typeof clientId === 'string') {
      const found = this.clients.find((c: any) => c.name === clientId);
      if (found) {
        clientId = found.id ?? found.pk;
      }
    }

    const parentId = this.rule.parent?.id ?? this.rule.parent ?? this.rule.id;

    const payload = {
      title: this.rule.title,
      useCaseId: this.rule.useCaseId || this.rule.ruleModel?.useCaseId,
      type: this.rule.type || 'SIEM',
      syntax: formVals.syntax,
      ruleCode: formVals.modalCode,
      logsources: this.rule.logsources || [],
      client: clientId,
      parent: parentId,
      status: 'Regra não validada',
      generate_sigma: false,
    };

    this.rulesService.createRule(payload).subscribe({
      next: () => {
        this.closeAssignModal();
        this.showToast();
        this.loadChildRules(this.rule.id);
      },
      error: (err: any) => {
        this.syntaxError =
          err.error?.error || 'Erro ao atribuir regra ao cliente.';
      },
    });
  }

  showToast(): void {
    this.showSuccessToast = true;
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.showSuccessToast = false;
    }, 8000);
  }

  closeToast(): void {
    this.showSuccessToast = false;
    clearTimeout(this.toastTimeout);
  }

  getTechniqueId(tech: string): string {
    if (!tech) return '';
    return tech.split(' - ')[0].trim();
  }

  getStatusClasses(status: string): string {
    switch (status) {
      case 'Em produção':
        return 'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/30 dark:border-green-800';
      case 'Regra não validada':
        return 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-800';
      case 'Em testes':
        return 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800';
      case 'Desativada':
        return 'text-gray-600 bg-gray-100 border-gray-300 dark:text-gray-400 dark:bg-gray-800 dark:border-gray-700';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700';
    }
  }
}

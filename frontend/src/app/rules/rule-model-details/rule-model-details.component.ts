import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Clipboard } from '@angular/cdk/clipboard';

import { RulesService } from '../../services/rules.service';
import { UsecasesService } from '../../services/usecases.service';
import { AuthService } from '../../services/auth.service';
import { SigmaConversionsService } from '../../services/sigma-conversions.service';

import { HeaderComponent } from '../../layout/header/header.component';
import { TitlebannerComponent } from '../../layout/titlebanner/titlebanner.component';
import { 
  CodeEditorModule, 
  CodeModel, 
  CodeModelChangedEvent, 
  CodeEditorComponent 
} from '@ngstack/code-editor';

@Component({
  selector: 'app-rule-model-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    HeaderComponent,
    TitlebannerComponent,
    CodeEditorModule
  ],
  templateUrl: './rule-model-details.component.html',
  styleUrl: './rule-model-details.component.css',
})
export class RuleModelDetailsComponent implements OnInit {
  // Dados principais
  ruleModel: any = { title: '', useCaseId: '', type: '', ruleCode: 'empty' };
  usecase: any = { title: '', description: '', mitreTechniques: [] };
  user: any = { companies: [] };
  
  clients: any[] = [];
  ruleInstances: any[] = [];
  code: string = '';
  message: string = '';

  // Configuração do Editor
  theme = 'vs';
  options = {
    language: 'YAML',
    fontSize: 15,
    minimap: { enabled: true },
    automaticLayout: true,
    dragAndDrop: true,
  };

  selectedModel: CodeModel = {
    value: '',
    language: 'YAML',
    uri: '',
  };

  // Formulário reativo do Modal
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
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.params['id']);

    this.rulesService.getRuleModelById(id).subscribe((data: any) => {
      this.ruleModel = data;

      const defaultSyntax = this.ruleModel.type === 'SIEM' ? 'Sigma Rule' : 'Yara Rule';

      this.createRuleForm.patchValue({
        modalCode: this.ruleModel.ruleCode,
        syntax: defaultSyntax,
      });

      this.selectedModel = {
        value: this.ruleModel.ruleCode,
        language: 'YAML',
        uri: '',
      };

      this.loadUseCaseAndClients();
    });
  }

  private loadUseCaseAndClients(): void {
    this.useCaseService.getUseCaseById(this.ruleModel.useCaseId).subscribe((useCaseData: any) => {
      this.usecase = useCaseData;

      this.authService.getClients().subscribe((clientsData: any) => {
        this.clients = clientsData;

        this.rulesService.getRules().subscribe((rulesData: any) => {
          this.ruleInstances = rulesData.filter(
            (rule: any) => rule.ruleModel.id == this.ruleModel.id
          );

          this.authService.loggedInInfo().subscribe((userInfo: any) => {
            this.user = userInfo;
            if (!this.user.companies) {
              this.user.companies = [];
            }

            if (this.user.companies.length > 0) {
              this.clients = this.clients.filter((client: any) =>
                this.user.companies.includes(client.name)
              );
            }
          });
        });
      });
    });
  }

  onEditorLoaded(editor: CodeEditorComponent): void {
    console.log('Editor loaded', editor);
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
    this.clipboard.copy(this.code);
  }

  updateRuleModelCode(): void {
    const newCode = this.selectedModel.value;
    const newSyntax = this.ruleModel.syntax;

    this.rulesService
      .updateRuleModelCode(this.selectedModel.value, this.ruleModel.id)
      .subscribe((data: any) => {
        this.message = data.message;
        setTimeout(() => (this.message = ''), 4000);
      });
  }

  openAssignModal(): void {
    const currentCode = this.selectedModel.value;
    this.ruleModel.ruleCode = currentCode;
    
    // CORREÇÃO: Como "Sigma Rule" já não está no HTML, temos de forçar uma opção que exista (ex: AQL)
    const defaultSyntax = this.ruleModel.type === 'SIEM' ? 'AQL (QRadar)' : 'AQL (QRadar)';

    this.createRuleForm.patchValue({
      modalCode: currentCode,
      syntax: defaultSyntax,
      logsources: null,
      client: ''
    });

    this.onSyntaxChange();
  }

  // --- Lógica da Modal de Conversão ---

  openConvertModal(): void {
    this.sourceRuleContent =
      this.selectedModel.value || this.ruleModel.ruleCode || '';
    this.convertedRuleContent = '';
    this.targetSyntax = '';
    this.isConverting = false;
    this.showConvertModal = true;
  }

  closeConvertModal(): void {
    this.showConvertModal = false;
  }

  convertRule(): void {
    if (!this.targetSyntax || !this.sourceRuleContent) return;

    this.isConverting = true;
    this.convertedRuleContent = '';

    if (
      this.targetSyntax === 'Sigma Rule' ||
      this.targetSyntax === 'YARA Rule'
    ) {
      this.convertedRuleContent = this.sourceRuleContent;
      this.isConverting = false;
      return;
    }

    let request$;
    switch (this.targetSyntax) {
      case 'SPL (Splunk)':
      case 'Splunk Rule':
        request$ = this.sigmaConversionsService.convertSigmaToSplunk(
          this.sourceRuleContent,
        );
        break;
      case 'AQL (QRadar)':
      case 'QRadar Rule':
        request$ = this.sigmaConversionsService.convertSigmaToQRadar(
          this.sourceRuleContent,
        );
        break;
      case 'Elastic Lucene Rule':
      case 'Elastic Rule':
        request$ = this.sigmaConversionsService.convertSigmaToElasticLucena(
          this.sourceRuleContent,
        );
        break;
      default:
        this.convertedRuleContent = this.sourceRuleContent;
        this.isConverting = false;
        return;
    }

    request$.subscribe({
      next: (res: any) => {
        const cleanCode = Array.isArray(res) && res.length > 0 ? res[0] : res;
        this.convertedRuleContent = cleanCode;
        this.isConverting = false;
      },
      error: (err: any) => {
        const errorMessage =
          err.error?.error || err.statusText || 'Erro na conversão.';
        this.convertedRuleContent = `Falha na conversão: ${errorMessage}`;
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
    if (!this.convertedRuleContent) return;

    this.ruleModel.syntax = this.targetSyntax;
    const lang = this.getMonacoLanguage(this.targetSyntax);
    this.options.language = lang;

    this.selectedModel = {
      value: this.convertedRuleContent,
      language: lang,
      uri: `model-${this.ruleModel.id}-${Date.now()}`,
    };

    this.ruleModel.ruleCode = this.convertedRuleContent;
    this.closeConvertModal();
  }

  // --- Fim da Modal de Conversão ---

  onSyntaxChange(): void {
    const selectedSyntax = this.createRuleForm.get('syntax')?.value;
    const baseCode = this.ruleModel.ruleCode;

    if (!selectedSyntax) return;

    let request$;

    switch (selectedSyntax) {
      case 'SPL (Splunk)':
      case 'Splunk Rule':
        request$ = this.sigmaConversionsService.convertSigmaToSplunk(baseCode);
        break;
      case 'SPL2 (Splunk)': // AGORA TEM A SUA PRÓPRIA FUNÇÃO
        request$ = this.sigmaConversionsService.convertSigmaToSplunk2(baseCode);
        break;
      case 'AQL (QRadar)':
      case 'QRadar Rule':
        request$ = this.sigmaConversionsService.convertSigmaToQRadar(baseCode);
        break;
      case 'EQL (Elastic)':
      case 'Elastic Lucene Rule':
      case 'Elastic Rule':
        request$ = this.sigmaConversionsService.convertSigmaToElasticLucena(baseCode);
        break;
      case 'CQL (CrowdStrike)':
      case 'CrowdStrike Rule':
        request$ = this.sigmaConversionsService.convertSigmaToCrowdstrike(baseCode);
        break;
      case 'KQL (Sentinel)':
      case 'Sentinel Rule':
        request$ = this.sigmaConversionsService.convertSigmaToSentinel(baseCode);
        break;
      default:
        console.error('Sintaxe não suportada:', selectedSyntax);
        return;
    }

    request$.subscribe({
      next: (res: any) => {
        const cleanCode = Array.isArray(res) && res.length > 0 ? res[0] : res;
        this.createRuleForm.patchValue({ modalCode: cleanCode });
      },
      error: (err: any) => {
        const errorMessage = err.error?.error || err.statusText || 'Erro na conversão.';
        this.createRuleForm.patchValue({ modalCode: `Falha na conversão: ${errorMessage}` });
      },
    });
  }

  async createRule(): Promise<void> {
    const formValues = this.createRuleForm.value;
    let rule: any = {
      ruleModel: this.ruleModel.id,
      ruleCode: formValues.modalCode,
      logsources: formValues.logsources,
      client: formValues.client,
      syntax: formValues.syntax,
    };

    if (typeof rule.client === 'string') {
      const foundClient = this.clients.find((c: any) => c.name === rule.client);
      if (foundClient) {
        rule.client = foundClient.pk;
      }
    }

    try {
      const convertedData = await this.convertRuleToBackend(rule.syntax, rule.ruleCode);
      rule.ruleCode = convertedData;

      this.rulesService.createRule(rule).subscribe(() => {
        this.router.navigate(['/manage-rules']);
      });
    } catch (e) {
      console.error(e);
    }
  }

  private convertRuleToBackend(selectedSyntax: string, ruleCode: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // Adicionadas todas as 6 sintaxes para passarem na validação
      const validSyntaxes = [
        'AQL (QRadar)', 'CQL (CrowdStrike)', 'EQL (Elastic)', 
        'KQL (Sentinel)', 'SPL (Splunk)', 'SPL2 (Splunk)'
      ];

      if (validSyntaxes.includes(selectedSyntax)) {
        resolve(ruleCode);
      } else {
        reject(new Error('Unknown syntax: ' + selectedSyntax));
      }
    });
  }
}


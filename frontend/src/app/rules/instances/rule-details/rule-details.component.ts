import { Component } from '@angular/core';
import { RulesService } from '../../../services/rules.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HeaderComponent } from '../../../layout/header/header.component';
import { TitlebannerComponent } from '../../../layout/titlebanner/titlebanner.component';
import { UsecasesService } from '../../../services/usecases.service';
import {
  CodeEditorComponent,
  CodeEditorModule,
  CodeModel,
  CodeModelChangedEvent,
} from '@ngstack/code-editor';
import { Clipboard } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { SigmaConversionsService } from '../../../services/sigma-conversions.service';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-rule-details',
  standalone: true,
  templateUrl: './rule-details.component.html',
  styleUrl: './rule-details.component.css',
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
export class RuleDetailsComponent {
  selectLogsources: any;

  constructor(
    private sigmaConversionsService: SigmaConversionsService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private rulesService: RulesService,
    private useCaseService: UsecasesService,
    private clipboard: Clipboard,
  ) {}

  code: any = '';
  clients: any = [];
  selectClient: any;
  convertedCode: any = '';
  conversionError: string = '';
  conversionSource: string = '';

  rule: any = {};
  usecase: any = {};

  selectedModel: CodeModel = {
    value: this.rule.ruleCode,
    language: 'YAML',
    uri: '',
  };

  selectedModelModal: CodeModel = {
    value: 'teste',
    language: 'YAML',
    uri: '',
  };

  theme = 'vs';
  themeModal = 'vs';

  options = {
    language: 'YAML',
    fontSize: 15,
    minimap: {
      enabled: true,
    },
    automaticLayout: true,
    dragAndDrop: true,
    wordWrap: 'on' as 'on',
  };

  optionsModal = {
    language: 'YAML',
    fontSize: 15,
    minimap: {
      enabled: true,
    },
    automaticLayout: true,
    dragAndDrop: true,
  };

  onEditorLoaded(editor: CodeEditorComponent) {
    console.log('loaded', editor);
  }

  onCodeModelChanged(event: CodeModelChangedEvent) {
    console.log('code model changed', event);
    setTimeout(() => {
      event.sender.formatDocument();
    }, 100);
  }

  onCodeChanged(value: any) {
    this.code = value;
  }

  ngOnInit() {
    var id = this.route.snapshot.params['id'];

    this.rulesService.getRuleById(id).subscribe((data: any) => {
      this.rule = data;
      console.log(this.rule);

      var newModel = {
        value: this.rule.ruleCode,
        language: '',
        uri: '',
      };

      this.selectedModel = JSON.parse(JSON.stringify(newModel));
      this.onCodeChanged(this.rule.ruleCode);

      this.useCaseService
        .getUseCaseById(this.rule.ruleModel.useCaseId)
        .subscribe((data: any) => {
          this.usecase = data;
          console.log(this.usecase);

          this.authService.getClients().subscribe((data: any) => {
            this.clients = data;
          });
        });
    });
  }

  copyToClipboard() {
    this.clipboard.copy(this.code);
  }

  downloadFile() {
    var blob = new Blob([this.convertedCode], { type: 'text/plain' });
    saveAs(blob, this.rule.ruleModel.title + '.txt');
  }

  private resetConversionState() {
    this.conversionError = '';
    this.convertedCode = '';
    this.conversionSource = '';
  }

  convertSigmaToSplunk() {
    this.resetConversionState();
    this.sigmaConversionsService.convertSigmaToSplunk(this.code).subscribe({
      next: (data: any) => {
        this.convertedCode = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        this.conversionSource = 'pySigma';
      },
      error: (err: any) => {
        this.conversionError = err.error?.error || err.message || 'Erro desconhecido ao converter para Splunk.';
      }
    });
  }

  convertSigmaToQRadar() {
    this.resetConversionState();
    this.sigmaConversionsService.convertSigmaToQRadar(this.code).subscribe({
      next: (data: any) => {
        this.convertedCode = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        this.conversionSource = 'pySigma';
      },
      error: (err: any) => {
        this.conversionError = err.error?.error || err.message || 'Erro desconhecido ao converter para QRadar.';
      }
    });
  }

  convertSigmaToElasticEQL() {
    this.resetConversionState();
    // Atualizado para chamar o método correto no serviço
    this.sigmaConversionsService.convertSigmaToElasticEQL(this.code).subscribe({
      next: (data: any) => {
        this.convertedCode = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        this.conversionSource = 'pySigma';
      },
      error: (err: any) => {
        this.conversionError = err.error?.error || err.message || 'Erro desconhecido ao converter para Elastic EQL.';
      }
    });
  }

  convertSigmaToCrowdStrike() {
    this.resetConversionState();
    this.sigmaConversionsService.convertSigmaToCrowdStrike(this.code).subscribe({
      next: (data: any) => {
        this.convertedCode = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        this.conversionSource = 'pySigma';
      },
      error: (err: any) => {
        this.conversionError = err.error?.error || err.message || 'Erro desconhecido ao converter para CrowdStrike (CQL).';
      }
    });
  }

  message: string = '';
  updateRuleCode() {
    this.rulesService
      .updateRuleCode(this.selectedModel.value, this.rule.id)
      .subscribe((data: any) => {
        console.log(data);
        this.message = data.message;

        setTimeout(() => {
          this.message = '';
        }, 4000);
      });
  }
}
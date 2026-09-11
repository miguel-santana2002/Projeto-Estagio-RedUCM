import { ChangeDetectorRef, Component, ɵformatRuntimeError } from '@angular/core';
import { HeaderComponent } from "../../layout/header/header.component";
import { TitlebannerComponent } from "../../layout/titlebanner/titlebanner.component";
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Type } from 'class-transformer';
import { CodeEditorComponent, CodeEditorModule, CodeModel, CodeModelChangedEvent } from '@ngstack/code-editor';
import {editor, Range} from 'monaco-editor'
import { UsecasesService } from '../../services/usecases.service';
import { RulesService } from '../../services/rules.service';
import { TagInputModule } from 'ngx-chips';
import { Router } from '@angular/router';


@Component({
    selector: 'app-create-rule-model',
    standalone: true,
    templateUrl: './create-rule-model.component.html',
    styleUrl: './create-rule-model.component.css',
    imports: [HeaderComponent, TitlebannerComponent, CommonModule, TagInputModule, FormsModule, ReactiveFormsModule, CodeEditorModule ]
})
export class CreateRuleModelComponent {

usecases : any = ['Vazio'];

registeredLogsources : string[] = ['Vazio'];

constructor(private useCasesService : UsecasesService, private rulesService : RulesService, private router : Router) { }



ngOnInit() {

  this.useCasesService.getUseCases().subscribe((data) => {
    this.usecases = data;

    this.rulesService.getRegisteredLogSources().subscribe((data : any) => {
      console.log(data);
      this.registeredLogsources = data.map((logsource: any) => logsource.name);

    })

  })

}

selectedUseCase : any = "";

code : any = "";



types = {
  SIEM: ['Sigma Rule', 'Splunk Rule', 'QRadar Rule', 'Elastic Lucene Rule'],
  SOAR: ['YARA Rule']
};



typeKeys() {
  return Object.keys(this.types);
}



selectedType: any = "SIEM";





  defaultCode = ``

  createRuleModel() {

    var arrayLogsources : any = this.createRuleModelForm.value.logsources

    var logsources = arrayLogsources?.map((logsource: any) => logsource.value);
    
    var ruleModel = {
      title: this.createRuleModelForm.value.title,
      useCaseId: this.selectedUseCase,
      type: this.selectedType,
      ruleCode: this.selectedModel.value,
      logsources: logsources
    }
    console.log(ruleModel);

this.rulesService.createRuleModel(ruleModel).subscribe((data) => {
  console.log(data);
  this.router.navigate(['/manage-rule-models']);



});




  }

  ruleModel :any = {
    title: "",
    useCaseId: "",
    type: "",
    ruleCode: "",
    logsources: []
}

createRuleModelForm = new FormGroup({
  title: new FormControl('', Validators.required),
  selectedUseCase: new FormControl('',Validators.required),
  selectedType: new FormControl('',Validators.required),
  logsources: new FormControl('',Validators.required),

})



options = {
  language: 'YAML',
  
  
  minimap: {
    enabled: true,
  },
  automaticLayout: true,
dragAndDrop: true,


}

selectedModel : CodeModel = {
  value: this.defaultCode,
  language: 'YAML',
  uri: ''
}

theme = 'vs'

onEditorLoaded(editor: CodeEditorComponent) {
  console.log('loaded', editor);
}

onCodeModelChanged(event: CodeModelChangedEvent) {

  console.log('code model changed', event);

  setTimeout(() => {
    event.sender.formatDocument();
  }, 100);
}

onCodeChanged(value : any) {
}



examples: { [key: string]: string } = {
  'Sigma Rule': `title: ${this.createRuleModelForm.value.title || 'Título da Regra'}
  status: experimental
  description: Uma descrição do que sua regra é destinada a detectar
  references:
      - Uma lista de todas as referências que podem ajudar um leitor ou analista a entender o significado de uma regra acionada
  tags:
      - attack.execution  # exemplo de categoria MITRE ATT&CK
      - attack.t1059      # exemplo de ID da técnica MITRE ATT&CK
      - car.2014-04-003   # exemplo de ID do CAR
  author: Michael Haag, Florian Roth, Markus Neis  # exemplo, uma lista de autores
  date: 06/04/2018  # Data da regra
  logsource:                      # importante para o mapeamento de campos em arquivos de configuração pré-definidos ou adicionais
      category: process_creation  # Neste exemplo, escolhemos a categoria 'process_creation'
      product: windows            # o produto respectivo
  detection:
      selection:
          NomeDoCampo: 'ValorString'
          NomeDoCampo: ValorInteiro
          NomeDoCampo|modificador: 'Valor'
      condition: seleção
  fields:
      - campos na fonte de log que são importantes para investigar mais a fundo
  falsepositives:
      - descrever possíveis condições de falsos positivos para ajudar os analistas em sua investigação
  level: um dos cinco níveis (informational, low, medium, high, critical)
  `,
  'Splunk Rule': `# Título da Regra: [TÍTULO DA REGRA]

  # ID da Regra: [ID_DA_REGRA]
  
  # Descrição:
  # Descreva brevemente o que essa regra detecta e por que é importante.
  
  # Autor: [NOME_DO_AUTOR]
  
  # Nível de Severidade: [NÍVEL_DE_SEVERIDADE]
  
  # Categoria: [CATEGORIA_DA_REGRA]
  
  # Tags: [TAGS_RELACIONADOS]
  
  # Ambiente: [AMBIENTE_RECOMENDADO]
  
  # Condições de Detecção:
  
  # Substitua os placeholders abaixo pelos campos e valores relevantes dos seus dados.
  
  index=[NOME_DO_INDICE]
  sourcetype=[TIPO_DE_FONTE_DE_DADOS]
  | [AÇÃO_DE_PESQUISA_OU_FILTRO]
  | [OUTRA_AÇÃO_DE_PESQUISA_OU_FILTRO_SE_NECESSÁRIO]
  | [CONDICIONAL_ADICIONAL_SE_NECESSÁRIO]
  
  # Consequências:
  # Descreva as possíveis consequências ou impactos da atividade detectada.
  
  # Recomendações de Mitigação:
  # Forneça orientações sobre como lidar com a atividade detectada ou como mitigar os possíveis riscos.
  
  # Referências:
  # Inclua quaisquer referências relevantes ou recursos adicionais relacionados a esta regra.
  `,
  'QRadar Rule': `# Nome da regra
  name: "Nome da Regra"
  
  # Descrição da regra
  description: |
    Descrição da atividade ou ameaça que esta regra detecta.
  
  # Lista de regras (pode haver várias)
  rules:
  
    # Regra 1
    - rule_name: "Nome da Regra 1"
      description: "Descrição da Regra 1"
  
      # Condição da regra
      when:
        # Condições de correspondência do evento
        - "Condição de Correspondência 1"
        - "Condição de Correspondência 2"
        # ...
      
      # Ações a serem executadas quando a regra corresponder
      then:
        # Ação 1
        - "Ação 1"
        # Ação 2
        - "Ação 2"
        # ...
notes: |
  Notas adicionais sobre a regra, referências, etc.
      `,

'Elastic Lucene Rule':
`
{
  "name": "${this.createRuleModelForm.value.title || 'Título da Regra'}",
  "description": "Uma descrição do que a sua regra é destinada a detectar",
  "risk_score": 50,
  "severity": "médio",
  "type": "query",
  "language": "lucene",
  "query": "event.category:authentication AND event.outcome:failure"
  "index": ["seu-indice-padrao-*"],
  "interval": "5m",
  "from": "now-5m",
  "actions": [
    {
      "action_type_id": ".email",
      "group": "default",
      "params": {
        "to": ["seu_email@exemplo.com"],
        "subject": "Alerta: ${this.createRuleModelForm.value.title || 'Título da Regra'}",
        "message": "Um alerta foi acionado com base na sua consulta Lucene: {{context.query}}"
      }
    }
  ],
  "throttle": "1h",
  "tags": ["exemplo", "lucene", "detecção"],
  "enabled": true
}`
      
}

}
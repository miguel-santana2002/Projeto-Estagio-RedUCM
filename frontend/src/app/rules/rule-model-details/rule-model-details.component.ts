import { Component } from '@angular/core';
import { RulesService } from '../../services/rules.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HeaderComponent } from "../../layout/header/header.component";
import { TitlebannerComponent } from "../../layout/titlebanner/titlebanner.component";
import { UsecasesService } from '../../services/usecases.service';
import { CodeEditorComponent, CodeEditorModule, CodeModel, CodeModelChangedEvent } from '@ngstack/code-editor';
import {Clipboard} from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { SigmaConversionsService } from '../../services/sigma-conversions.service';

@Component({
    selector: 'app-rule-model-details',
    standalone: true,
    templateUrl: './rule-model-details.component.html',
    styleUrl: './rule-model-details.component.css',
    imports: [HeaderComponent, TitlebannerComponent, CodeEditorModule, CommonModule, RouterModule, FormsModule, ReactiveFormsModule]
})
export class RuleModelDetailsComponent {
selectLogsources: any;
  
registeredLogsources: any = [];
  constructor(private sigmaConversionsService : SigmaConversionsService ,private authService : AuthService, private route: ActivatedRoute, private rulesService: RulesService, private useCaseService : UsecasesService, private clipboard: Clipboard, private router: Router )  {}

code: any = "";
  
clients : any = [];

selectClient : any;

ruleInstances : any = []

user : any = {
  companies: []

}

usercompanynames : any = [];


  ruleModel :any = {
    title: "",
    useCaseId: "",
    type: "",
    ruleCode: "empty"
}
  usecase: any = {
    title: "",
    description: "",
    mitreTechniques: [],
  }


  selectedModel : CodeModel = {
    value: this.ruleModel.ruleCode,
    language: 'YAML',
    uri: ''
  }

  selectedModelModal : CodeModel = {
    value: 'teste',
    language: 'YAML',
    uri: ''
  }

  theme = 'vs'
  themeModal = 'vs'

  
options = {
  language: 'YAML',
  fontSize: 15,
  minimap: {
    enabled: true,
  },
  automaticLayout: true,
dragAndDrop: true,


}

optionsModal = {
  language: 'YAML',
  fontSize: 15,
  minimap: {
    enabled: true,
  },
  automaticLayout: true,
dragAndDrop: true,


}


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
  this.code = value;
}

  ngOnInit() {

    var id = this.route.snapshot.params['id']


    this.rulesService.getRuleModelById(id).subscribe((data: any) => {
      this.ruleModel = data;
      console.log(this.ruleModel);

      this.createRuleForm.get('modalCode')?.setValue(this.ruleModel.ruleCode);


      var newModel = {
        value: this.ruleModel.ruleCode,
        language: '',
        uri: ''
      }
      
        this.selectedModel = JSON.parse(JSON.stringify(newModel));
      
      



      this.useCaseService.getUseCaseById(this.ruleModel.useCaseId).subscribe((data: any) => {
        this.usecase = data;
        console.log(this.usecase);

        this.authService.getClients().subscribe((data: any) => {
          this.clients = data

  


          this.rulesService.getRules().subscribe((data: any) => {
            const filteredRules = data.filter((rule: any) => rule.ruleModel.id == this.ruleModel.id);

            this.ruleInstances = filteredRules;
            console.log(this.ruleInstances);

            this.authService.loggedInInfo().subscribe((value) => {
              this.user = value;
              if (this.user.companies === null) {
                this.user.companies = [];
              }
              console.log("USER")
              console.log(this.user);
              

              if (this.user.companies?.length > 0) {
                this.clients = this.clients.filter((client: any) => this.user.companies?.includes(client.name));
              }
              console.log(this.ruleInstances);



              

          });
        });
        });
      });

    });

  }

  copyToClipboard() {

this.clipboard.copy(this.code);

    
  }

  message : string = "";
  updateRuleModelCode() {
    this.rulesService.updateRuleModelCode(this.selectedModel.value, this.ruleModel.id).subscribe((data: any) => {
      console.log(this.message);
      this.message = data.message;

      setTimeout(() => {
        this.message = "";
      }, 4000);
    });
  }


  async createRule() {
    var rule = {
      ruleModel: this.ruleModel.id,
      ruleCode: this.createRuleForm.get('modalCode')?.value,
      logsources: this.createRuleForm.get('logsources')?.value,
      client: this.createRuleForm.get('client')?.value,
      syntax: this.createRuleForm.get('syntax')?.value
    };

    console.log(rule);

    if (typeof rule.client === 'string') {
      console.log("entrou aqui");
      console.log(this.clients);

      const client = this.clients.find((c: any) => c.name === rule.client);
      if (client) {
        rule.client = client.pk;
      }
    }

    console.log(rule);
    console.log(this.clients);

    try {
      const data = await this.convertRuleToBackend(rule.syntax, rule.ruleCode);
      rule.ruleCode = data;

      console.log(rule);
      this.rulesService.createRule(rule).subscribe((data: any) => {
        console.log(data);
        this.router.navigate(['/manage-rules']);
      });
    } catch (e) {
      console.error(e);
    }
  }

 createRuleForm = new FormGroup({
  modalCode: new FormControl(this.ruleModel.ruleCode),
  logsources: new FormControl(null),
  client: new FormControl(''),
  syntax: new FormControl('')
 })

soarSintaxes = ['Yara Rule']
siemSintaxes = ['Sigma Rule', 'Splunk Rule', 'QRadar Rule', 'Elastic Rule']


convertedCode : any;

convertRuleToBackend(selectedSyntax: any, ruleCode : any): Promise<any> {
  return new Promise((resolve, reject) => {
    // Non-Sigma syntaxes: store as-is without conversion
    if (selectedSyntax === 'Yara Rule' || selectedSyntax === 'Splunk Rule' || selectedSyntax === 'QRadar Rule' || selectedSyntax === 'Elastic Rule') {
      resolve(ruleCode);
    } else if (selectedSyntax === 'Sigma Rule') {
      // Sigma rules are stored as-is
      resolve(ruleCode);
    } else {
      reject(new Error('Unknown syntax: ' + selectedSyntax));
    }
  });
}
}
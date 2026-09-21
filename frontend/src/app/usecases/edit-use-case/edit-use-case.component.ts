import { Component, OnInit } from '@angular/core';
import { TitlebannerComponent } from "../../layout/titlebanner/titlebanner.component";
import { HeaderComponent } from "../../layout/header/header.component";
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MitreService } from '../../services/mitre.service';
import { CommonModule } from '@angular/common';
import { UsecasesService } from '../../services/usecases.service';
import { CdkPortal } from '@angular/cdk/portal';
import { ActivatedRoute, Router } from '@angular/router';
import { TagInputModule } from 'ngx-chips';
import { Binary } from '@angular/compiler';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-edit-use-case',
    standalone: true,
    templateUrl: './edit-use-case.component.html',
    styleUrl: './edit-use-case.component.css',
    imports: [TitlebannerComponent, HeaderComponent, MatFormFieldModule, MatSelectModule, MatIconModule, TagInputModule, TitlebannerComponent, HeaderComponent, ReactiveFormsModule, FormsModule, CommonModule]
})
export class EditUseCaseComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private mitreService: MitreService,
    private usecasesService: UsecasesService,
    private router: Router
) {}

taxonomiaCNCS : any = [
        {"Código Malicioso": ["Sistema Infetado", "Distribuição de Malware", "Servidor C2", "Configuração de Malware"]},
        {"Disponibilidade": ["Negação de Serviço", "Abuso de Recursos", "Outage / Indisponibilidade"]},
        {"Recolha de Informação": ["Scanners de Vulnerabilidades", "Social Engineering", "Scanning / Probing"]},
        {"Intrusão": ["Exploração de Vulnerabilidades", "Comprometimento de Contas", "Obtenção de Credenciais"]},
        {"Tentativa de Intrusão": ["Tentativa de Exploração de Vulnerabilidades", "Força Bruta / Password Spraying"]},
        {"Segurança da Informação": ["Roubo de Informação", "Exfiltração de Dados", "Alteração de Informação"]},
        {"Fraude": ["Burlas", "Roubo de Identidade / Falsificação", "Uso Indevido de Recursos"]},
        {"Conteúdo Abusivo": ["SPAM", "Phishing", "Alojamento Indevido de Conteúdos"]},
        {"Vulnerabilidade": ["Sistema Vulnerável", "Aplicação Vulnerável"]},
        {"Outro": ["Outro"]}
];


playbookLink: string = '';
chavesTaxonomia = ["Código Malicioso", "Disponibilidade", "Recolha de Informação", "Intrusão", "Tentativa de Intrusão", "Segurança da Informação", "Fraude", "Conteúdo Abusivo", "Vulnerabilidade", "Outro"];
selectedCategory: string = '';
selectedSubcategory: string = '';
selectedCategoryValues: string[] = [];

// Lista para alimentar o autocomplete do MITRE ATT&CK
mitreAutocompleteList: string[] = [];

editUseCaseForm = new FormGroup({
  title: new FormControl('', Validators.required),
  description: new FormControl('', Validators.required),
  mitigation: new FormControl('', Validators.required),
  playbook: new FormControl(''),
  mitreTechniques: new FormControl([], Validators.required),
  cncsClass: new FormControl('', Validators.required),
  cncsType: new FormControl('', Validators.required),
  attackVectors: new FormControl([], Validators.required)
});
selectedFile: File | null = null;

ngOnInit(): void {

  this.loadMitreTechniques();

  const useCaseId = this.route.snapshot.paramMap.get('id');
    if (useCaseId) {
      this.usecasesService.getUseCaseById(Number(useCaseId)).subscribe(useCase => {
        this.editUseCaseForm.patchValue({
          title: useCase.title,
          description: useCase.description,
          mitigation: useCase.mitigation,
          mitreTechniques: useCase.mitreTechniques,
          cncsClass: useCase.cncsClass,
          cncsType: useCase.cncsType,
          attackVectors: useCase.attackVectors,
          playbook: useCase.playbook
        });
        this.selectedCategory = useCase.cncsClass;
        this.updateCNCSValues();
        this.playbookLink = useCase.playbook;

        //remove the first /media on the string
        this.playbookLink = this.playbookLink.substring(6);

        console.log(this.playbookLink);
        console.log("AQUIIIIIIII");
      });
    }
}

loadMitreTechniques() {
    this.mitreService.getAllTechniques().subscribe({
        next: (data: any[]) => {
            // Mapeia para o formato "ID: Nome" ou "ID - Nome" para facilitar a correspondência no input
            this.mitreAutocompleteList = data.map((t: any) => `${t.id} - ${t.name}`);
        },
        error: (error) => {
            console.error('Erro ao carregar as técnicas do MITRE do backend', error);
        }
    });
}

updateCNCSValues() {
  this.selectedCategory = this.editUseCaseForm.get('cncsClass')?.value || '';
  this.selectedCategoryValues = this.taxonomiaCNCS.find((entry: { [x: string]: any; }) => entry[this.selectedCategory])?.[this.selectedCategory] || [];
}

onFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
  }
}

updateUseCase() {
  const useCase: any = this.editUseCaseForm.value;

  useCase.rules = [];
  useCase.phaseTasks = [
      { phase: "Preparation", tasks: [] },
      { phase: "Detection and Analysis", tasks: [] },
      { phase: "Containment, Eradication and Recovery", tasks: [] },
      { phase: "Post-Event Activity", tasks: [] }
  ];

  
  const useCaseData = new FormData();
  useCaseData.append('title', useCase.title);
  useCaseData.append('description', useCase.description);
  useCaseData.append('mitigation', useCase.mitigation);
  if (this.selectedFile !== null) {
    console.log("ENTROU");
    useCaseData.append('playbook', this.selectedFile);
  } else {
    console.log(this.playbookLink);
    console.log("ENTROU NESTA ");
useCaseData.append('playbook', this.playbookLink);

    }


  const formattedAttackVectors = useCase.attackVectors.map((av: any) => typeof av === 'string' ? av : av.value);
useCaseData.append('attackVectors', `{${formattedAttackVectors.join(',')}}`);

const formattedMitreTechniques = useCase.mitreTechniques.map((mt: any) => typeof mt === 'string' ? mt : mt.value);
useCaseData.append('mitreTechniques', `{${formattedMitreTechniques.join(',')}}`);
  useCaseData.append('cncsClass', useCase.cncsClass);
  useCaseData.append('cncsType', useCase.cncsType);




  useCaseData.append('rules', `{${useCase.rules.join(',')}}`);
  useCaseData.append('phaseTasks', JSON.stringify(useCase.phaseTasks));

  const useCaseId = this.route.snapshot.paramMap.get('id');
  if (useCaseId) {
  
      this.usecasesService.updateUseCase(Number(useCaseId), useCaseData).subscribe({
          next: () => {
              this.router.navigate(['/manage-use-cases']);
          },
          error: (error) => {
              console.error('Erro ao atualizar o Use Case', error);
          }
      });
  }

}
}

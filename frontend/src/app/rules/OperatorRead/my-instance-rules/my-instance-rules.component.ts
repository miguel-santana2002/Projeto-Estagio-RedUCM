import { CommonModule, DatePipe } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { Modal } from 'flowbite';
import { TitlebannerComponent } from '../../../layout/titlebanner/titlebanner.component';
import { RouteConfigLoadStart, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../layout/header/header.component';
import { AuthService } from '../../../services/auth.service';
import { RulesService } from '../../../services/rules.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-my-instance-rules',
  standalone: true,
  imports: [HeaderComponent, FormsModule, CommonModule, DatePipe, TitlebannerComponent, RouterModule, MatFormFieldModule, MatSelectModule, MatIconModule],
  templateUrl: './my-instance-rules.component.html',
  styleUrl: './my-instance-rules.component.css'
})
export class MyInstanceRulesComponent {

  constructor(private authService : AuthService, private rulesService : RulesService) { }

  
  sortType = 'name';
  sortReverse = false;
  nameSearch: string = '';
  selectDelete:  number = 999999;
  user : any = { username: "", companies: [] };

  updateSelectDelete(event: Event, id: number) {
    event.stopPropagation();
    console.log('updateSelectDelete', id);
    this.selectDelete = id;

  }

  types = ['SIEM', 'SOAR'];
  sintaxes = ['Sigma Rule', 'Splunk Rule', 'QRadar Rule'];

selectedSintaxes : string[] = []
selectedTypes :string[] = []

updateSelectedTypes() {
  
  console.log('updateSelectedTypes', this.selectedTypes);

}



rules: any = [];  
  ngOnInit() {
    
    this.rulesService.getRules().subscribe((data: any) => {
      
      
      this.authService.loggedInInfo().subscribe((value) => {
        this.user = value;
  
        if (this.user.companies == null) {
          this.user.companies = [];
        }
        

      console.log(data)

      console.log(this.rules)

      console.log(this.user.companies)

      this.rules = data.filter((rule: any) => this.user.companies?.includes(rule.client.name));
      
      this.startFilters();
    
    
    });
  });
    }
  



  sortTable(column: string): void {
    if (this.sortType === column) {

      this.sortReverse = !this.sortReverse;
    } else {

      this.sortType = column;
      this.sortReverse = false;
    }


    this.rules.sort((a: any, b: any) => {
      const valueA = a[column];
      const valueB = b[column];

      if (typeof valueA === 'string') {
        return this.sortString(valueA, valueB);
      } else {
        return this.sortNumeric(valueA, valueB);
      }
    });
  }

  deleteRuleModel() {

this.rulesService.deleteRuleModelById(this.selectDelete).subscribe((data: any) => {
  console.log(data)
  this.rulesService.getRules().subscribe((data: any) => {
    this.rules = data

    console.log(data)
  
  
  });

});
    

}
  

  private sortString(a: string, b: string): number {
    return a.localeCompare(b) * (this.sortReverse ? -1 : 1);
  }

  private sortNumeric(a: number, b: number): number {
    return (a - b) * (this.sortReverse ? -1 : 1);
  }


  get filteredRules() {

var f1 = this.rules.filter((u: any) => u.ruleModel.title.toLowerCase().includes(this.nameSearch.toLowerCase()));
var f2 = this.selectedTypes.length > 0 ? f1.filter((u: any) => this.selectedTypes.includes(u.ruleModel.type)) : f1;
var f3 = this.selectedSintaxes.length > 0 ? f2.filter((u: any) => this.selectedSintaxes.includes(u.ruleModel.syntax)) : f2
var f4 = this.selectedUseCases.length > 0 ? f3.filter((u: any) => this.selectedUseCases.includes(u.ruleModel.useCaseId)) : f3;
var f5 = this.selectedClients.length > 0 ? f4.filter((u: any) => this.selectedClients.includes(u.client.name)) : f4;
var f6 = this.selectedLogsources.length > 0 ? f5.filter((u: any) => this.selectedLogsources.some((r: any) => u.logsources.includes(r))) : f5;
return f6;
  }

 

  
  @ViewChild('modal') modal!: ElementRef<HTMLElement>;
  modalFlowbite!: Modal;

  ngAfterViewInit() {
    this.modalFlowbite = new Modal(this.modal.nativeElement);
  }

  openModal() {
    this.modalFlowbite.show();
  }

  closeModal() {
    this.modalFlowbite.hide();
  }


  uniqueTypes : string[] = [];
  uniqueSintaxes : string[] = [];
  uniqueUseCases : string[] = [];
  uniqueClients : string[] = [];
  uniqueLogsources : string[] = [];

  selectedUseCases: string[] = [];
  selectedClients: string[] = [];
  selectedLogsources: string[] = [];
  startFilters() {
this.uniqueClients = this.rules.map((item: any) => item.client.name).filter((value: any, index: any, self: any) => self.indexOf(value) === index);
this.uniqueTypes = this.rules.map((item: any) => item.ruleModel.type).filter((value: any, index: any, self: any) => self.indexOf(value) === index);
this.uniqueSintaxes = this.rules.map((item: any) => item.ruleModel.syntax).filter((value: any, index: any, self: any) => self.indexOf(value) === index);
this.uniqueUseCases = this.rules.map((item: any) => item.ruleModel.useCaseId).filter((value: any, index: any, self: any) => self.indexOf(value) === index);
this.uniqueLogsources = Array.from(new Set(this.rules.flatMap((item: any) => item.logsources)));
console.log('uniqueClients', this.uniqueClients);
console.log('uniqueTypes', this.uniqueTypes);
console.log('uniqueSintaxes', this.uniqueSintaxes);
console.log('uniqueUseCases', this.uniqueUseCases);
console.log('uniqueLogsources', this.uniqueLogsources);
  }


  clearSelectedClients() {
    this.selectedClients = [];
  }
  clearSelectedUseCases() {
    this.selectedUseCases = [];
  }
  clearSelectedLogsources() {
    this.selectedLogsources = [];
  }
  clearSelectedTypes() {
    this.selectedTypes = [];
  }
  clearSelectedSintaxes() {
    this.selectedSintaxes = [];
  }
  

}


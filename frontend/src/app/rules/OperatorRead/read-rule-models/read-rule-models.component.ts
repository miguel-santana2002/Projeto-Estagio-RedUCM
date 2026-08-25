import { CommonModule, DatePipe } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { Modal } from 'flowbite';
import { TitlebannerComponent } from '../../../layout/titlebanner/titlebanner.component';
import { RouteConfigLoadStart, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../layout/header/header.component';
import { AuthService } from '../../../services/auth.service';
import { RulesService } from '../../../services/rules.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-read-rule-models',
  standalone: true,
  imports: [HeaderComponent, FormsModule, CommonModule, DatePipe, TitlebannerComponent, RouterModule, MatFormFieldModule, MatSelectModule, MatIconModule, ReactiveFormsModule],
  templateUrl: './read-rule-models.component.html',
  styleUrl: './read-rule-models.component.css'
})
export class ReadRuleModelsComponent {


  constructor(private authService : AuthService, private rulesService : RulesService) { }

  
  sortType = 'name';
  sortReverse = false;
  nameSearch: string = '';
  selectDelete:  number = 999999;

  updateSelectDelete(event: Event, id: number) {
    event.stopPropagation();
    console.log('updateSelectDelete', id);
    this.selectDelete = id;

  }

  types = ['SIEM', 'SOAR'];
  sintaxes = ['Sigma Rule', 'Splunk Rule', 'QRadar Rule'];

selectedSintaxes : string[] = []
selectedTypes : string[] = []
selectedLogSources : string[] = []

updateSelectedTypes() {
  
  console.log('updateSelectedTypes', this.selectedTypes);

}



ruleModels: any = [];  

  ngOnInit() {
    console.log('Manage Users Component');
    this.rulesService.getRuleModels().subscribe((data: any) => {
      this.ruleModels = data

      console.log(data)
      this.startFilters()
    
    });
    }
  



  sortTable(column: string): void {
    if (this.sortType === column) {

      this.sortReverse = !this.sortReverse;
    } else {

      this.sortType = column;
      this.sortReverse = false;
    }


    this.ruleModels.sort((a: any, b: any) => {
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
  this.rulesService.getRuleModels().subscribe((data: any) => {
    this.ruleModels = data

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


  get filteredRuleModels() {
   var f1 = this.ruleModels.filter((u: any) => u.title.toLowerCase().includes(this.nameSearch.toLowerCase()));
   var f2 = this.selectedSintaxes.length > 0 ? f1.filter((u: any) => this.selectedSintaxes.includes(u.syntax)) : f1;
    var f3 = this.selectedTypes.length > 0 ? f2.filter((u: any) => this.selectedTypes.includes(u.type)) : f2;
    var f4 = this.selectedLogSources.length > 0 ? f3.filter((u: any) => u.logsources.some((l: any) => this.selectedLogSources.includes(l))) : f3;
    return f4;
    
  }

  clearFilters() {
    this.selectedSintaxes = []
    this.selectedTypes = []
    this.selectedLogSources = []
    this.nameSearch = ''
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


  uniqueSintaxes : any = []
  uniqueTypes : any = []
  uniqueLogSources : any = []
  startFilters() {

this.uniqueSintaxes = [...new Set(this.ruleModels.map((item: any) => item.syntax))]
this.uniqueTypes = [...new Set(this.ruleModels.map((item: any) => item.type))]
this.uniqueLogSources = Array.from(new Set(this.ruleModels.flatMap((item: any) => item.logsources)));




console.log('uniqueSintaxes', this.uniqueSintaxes)
console.log('uniqueTypes', this.uniqueTypes)
console.log('uniqueLogSources', this.uniqueLogSources)

  }

  updateSelectedSyntax(event: Event) {


    console.log('selectedSyntax', this.selectedSintaxes);
}

clearSelectedSyntax() {
  this.selectedSintaxes = []
}

clearSelectedTypes() {
  this.selectedTypes = []
}

clearSelectedLogSources() {
  this.selectedLogSources = []
}



}

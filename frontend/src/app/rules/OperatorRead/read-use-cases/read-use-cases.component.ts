import { Component, ElementRef, ViewChild } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { TitlebannerComponent } from "../../../layout/titlebanner/titlebanner.component";
import { HeaderComponent } from "../../../layout/header/header.component";
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UsecasesService } from '../../../services/usecases.service';
import { Modal } from 'flowbite';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-read-use-cases',
  standalone: true,
  imports: [TitlebannerComponent, HeaderComponent, FormsModule, ReactiveFormsModule, CommonModule, RouterModule, MatFormFieldModule, MatSelectModule, MatIconModule],
  templateUrl: './read-use-cases.component.html',
  styleUrl: './read-use-cases.component.css'
})
export class ReadUseCasesComponent {
  selectedValues: any;


  constructor(private useCasesService : UsecasesService) { }

  selectedFilter : any;
  sortType = 'name';
  sortReverse = false;
  nameSearch: string = '';
  selectDelete:  number = 999999;

  updateSelectDelete(event: Event, id: number) {
    event.stopPropagation();
    console.log(id)
    this.selectDelete = id;
  }




  tactics = ["Initial Access",
  "Execution",
  "Persistence",
  "Privilege Escalation",
  "Defense Evasion",
  "Credential Access",
  "Discovery",
  "Lateral Movement",
  "Collection", 
  "Command and Control",
  "Exfiltration",
  "Impact"];

  useCases : any = [ ]
  
  selectedTactics: any = [];

  ngOnInit() {

    this.useCasesService.getUseCases().subscribe((data: any) => {
      this.useCases = data

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


    this.useCases.sort((a: any, b: any) => {
      const valueA = a[column];
      const valueB = b[column];

      if (typeof valueA === 'string') {
        return this.sortString(valueA, valueB);
      } else {
        return this.sortNumeric(valueA, valueB);
      }
    });
  }

  updateSelectedTactics(){

   
    
    
console.log(this.selectedTactics)
  }

  deleteUseCase() {
console.log("deleteUseCase")
    console.log(this.selectDelete)
this.useCasesService.deleteUseCase(this.selectDelete).subscribe((data: any) => {

  this.useCases = this.useCases.filter((u: any) => u.id !== this.selectDelete);
});
  }

  private sortString(a: string, b: string): number {
    return a.localeCompare(b) * (this.sortReverse ? -1 : 1);
  }

  private sortNumeric(a: number, b: number): number {
    return (a - b) * (this.sortReverse ? -1 : 1);
  }


  get filteredUseCases() {

    
   var f1 = this.useCases.filter((u: any) => u.title.toLowerCase().includes(this.nameSearch.toLowerCase()));
  //filter by selectedMitreTechniques
  var f2 = f1.filter((u: any) => {
    if (this.selectedMitreTechniques.length === 0) {
      return true;
    } else {
      return this.selectedMitreTechniques.some((technique: string) => u.mitreTechniques.includes(technique));
    }
  });
  //filter by selectedCNCSClass
  var f3 = f2.filter((u: any) => {
    if (this.selectedCNCSClass.length === 0) {
      return true;
    } else {
      return this.selectedCNCSClass.includes(u.cncsClass);
    }
  });
  return f3;  

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

  selectedCNCSClass: string[] = [];
  selectedMitreTechniques: string[] = [];

  uniqueCNCSClasses : any = [];
  uniqueMitreTechniques : any = [];

  startFilters() {

    this.uniqueCNCSClasses = this.useCases.map((u: any) => u.cncsClass).filter((value: any, index: any, self: any) => self.indexOf(value) === index);
    this.useCases.forEach((u: { mitreTechniques: string[]; }) => {
      u.mitreTechniques.forEach((technique: string) => {
          if (!this.uniqueMitreTechniques.includes(technique)) {
              this.uniqueMitreTechniques.push(technique);
          }
      });
  });
console.log(this.uniqueMitreTechniques)

  }

  clearCNCSClass() {
    this.selectedCNCSClass = [];
  }

  clearMitreTechniques() {
    this.selectedMitreTechniques = [];
  }


 

  
  

}

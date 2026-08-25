import { Component } from '@angular/core';
import { HeaderComponent } from "../layout/header/header.component";
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { TitlebannerComponent } from "../layout/titlebanner/titlebanner.component";
import { AuthService } from '../services/auth.service';
import { User } from '../services/auth.service';
import { RouterModule } from '@angular/router';
import { Modal, initFlowbite } from 'flowbite';
import { ViewChild, ElementRef } from '@angular/core';

@Component({
    selector: 'app-manage-users',
    standalone: true,
    templateUrl: './manage-users.component.html',
    styleUrl: './manage-users.component.css',
    imports: [HeaderComponent, FormsModule, CommonModule, DatePipe, TitlebannerComponent, RouterModule]
})
export class ManageUsersComponent {

  constructor(private authService : AuthService) { }

  
  sortType = 'name';
  sortReverse = false;
  nameSearch: string = '';
  selectDelete:  number = 999999;
  showAllCompanies: boolean = false;
  showCompanies: { [key: number]: boolean } = {};
  toggleCompanies() {
    this.showAllCompanies = !this.showAllCompanies;
  }


  updateSelectDelete(id: number) {
    console.log('updateSelectDelete', id);
    this.selectDelete = id;



  }




  users : any = [ ]
  

  ngOnInit() {
    console.log('Manage Users Component');
    this.authService.getUsers().subscribe((data: any) => {
      this.users = data
      this.users.forEach((user: any) => {
        if (user.companies == null) {
          user.companies = [];
        }
      });

      this.startFilters();

      console.log(data)
    
      this.sortReverse = false; 

      this.users.sort((a: any, b: any) => {
        return this.sortNumeric(a.pk, b.pk);
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


    this.users.sort((a: any, b: any) => {
      const valueA = a[column];
      const valueB = b[column];

      if (typeof valueA === 'string') {
        return this.sortString(valueA, valueB);
      } else {
        return this.sortNumeric(valueA, valueB);
      }
    });
  }

  deleteUser() {

    this.authService.deleteUser(this.selectDelete).subscribe(() => {
      
      this.authService.getUsers().subscribe((data: any) => {
        this.users = data
      });
    });
  }

  private sortString(a: string, b: string): number {
    return a.localeCompare(b) * (this.sortReverse ? -1 : 1);
  }

  private sortNumeric(a: number, b: number): number {
    return (a - b) * (this.sortReverse ? -1 : 1);
  }


  get filteredUsers() {
    var f1 = this.users.filter((u: any) => u.email.toLowerCase().includes(this.nameSearch.toLowerCase()));
    var f2 = this.selectedClients.length > 0 ? f1.filter((u: any) => u.companies.some((c: any) => this.selectedClients.includes(c))) : f1;
  
    var f3;
    if (this.selectedRoles === '' || this.selectedRoles.includes('Operador') && this.selectedRoles.includes('Administrador')) {
   
      f3 = f2;
    } else if (this.selectedRoles.includes('Operador') ) {
      f3 = f2.filter((u: any) => u.companies && u.companies.length > 0);
    } else if (this.selectedRoles.includes('Administrador')) {
      f3 = f2.filter((u: any) => !u.companies || u.companies.length === 0);
    }
    
    else {
      f3 = f2;
    }

  
    return f3;
  }

 

  
  @ViewChild('modal') modal!: ElementRef<HTMLElement>;
  modalFlowbite!: Modal;

    
  @ViewChild('modalDetails') modalDetails!: ElementRef<HTMLElement>;
  modalDetailsFlowbite!: Modal;

  ngAfterViewInit() {
    this.modalFlowbite = new Modal(this.modal.nativeElement);
    this.modalDetailsFlowbite = new Modal(this.modalDetails.nativeElement);
  }

  openModal() {
    this.modalFlowbite.show();
  }

  closeModal() {
    this.modalFlowbite.hide();
  }

  selectedUser: any;

  openModalDetails(user : any) {
    this.modalDetailsFlowbite.show();
this.selectedUser = user;

  }

  closeModalDetails() {
    this.modalDetailsFlowbite.hide();
  }

  uniqueClients : any = [];
  roles = ['Administrador', 'Operador'];


  selectedClients: any = [];
  selectedRoles: any = [];

  startFilters() {
    
    this.uniqueClients = Array.from(new Set(this.users.flatMap((item: any) => item.companies)));

    console.log(this.users);
  }

  clearSelectedClients() {
    this.selectedClients = [];
  }

  clearSelectedRoles() {
    this.selectedRoles = [];
  }

  


}

import { Component } from '@angular/core';
import { HeaderComponent } from "../../layout/header/header.component";
import { TitlebannerComponent } from "../../layout/titlebanner/titlebanner.component";
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RulesService } from '../../services/rules.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-manage-logsources',
    standalone: true,
    templateUrl: './manage-logsources.component.html',
    styleUrl: './manage-logsources.component.css',
    imports: [HeaderComponent, TitlebannerComponent, FormsModule, CommonModule, ReactiveFormsModule]
})
export class ManageLogsourcesComponent {

newLog : any = {name: '', description:''} 
  logsources : any;

  errorMessage : any;
  createLogSource() {
    this.rulesService.createRegisteredLogSource(this.newLog).subscribe({
      next: (data) => {
        this.rulesService.getRegisteredLogSources().subscribe((data) => {
          this.logsources = data;
          this.errorMessage = null; // Clear the error message if successful
        });
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 400) {
          this.errorMessage = error.error.error; // Display the error message from the server
        }
      }
    });
  }

  deleteLogSourceById(id : any) {
    this.rulesService.deleteLogSourceById(id).subscribe((data) => {
      this.rulesService.getRegisteredLogSources().subscribe((data) => {
        this.logsources = data;
      })
    })
  }	


  constructor(private rulesService : RulesService) { }

  ngOnInit() {
 
    this.rulesService.getRegisteredLogSources().subscribe((data) => {
      this.logsources = data;
      console.log(this.logsources)
    })

  }

}

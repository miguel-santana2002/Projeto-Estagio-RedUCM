import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Output,
  Type,
} from '@angular/core';
import { HeaderComponent } from '../../layout/header/header.component';
import { TitlebannerComponent } from '../../layout/titlebanner/titlebanner.component';
import ApexCharts from 'apexcharts';
import { RulesService } from '../../services/rules.service';
import { UsecasesService } from '../../services/usecases.service';
import { RulesPerSyntaxComponent } from '../rules-per-syntax/rules-per-syntax.component';
import { RulesPerLogsourceComponent } from '../rules-per-logsource/rules-per-logsource.component';
import { RulesPerTypeComponent } from '../rules-per-type/rules-per-type.component';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { RadarTacticsComponent } from '../radar-tactics/radar-tactics.component';

@Component({
  selector: 'app-statistics-page',
  standalone: true,
  templateUrl: './statistics-page.component.html',
  styleUrl: './statistics-page.component.css',
  imports: [
    HeaderComponent,
    FormsModule,
    TitlebannerComponent,
    RulesPerSyntaxComponent,
    CommonModule,
    RulesPerLogsourceComponent,
    RulesPerTypeComponent,
    RadarTacticsComponent,
  ],
})
export class StatisticsPageComponent {
  constructor(
    private cdr: ChangeDetectorRef,
    private rulesService: RulesService,
    private useCasesService: UsecasesService,
    private authService: AuthService,
  ) {}

  filteredRules: any = [];
  rules: any;
  useCases: any;

  mitreTechniques: any = [];
  mitreTechniquesCount: any = [];

  clients: any = [];
  clientsCount: any = [];

  uniqueClientsName: any = [];
  clientsFromBd: any = [];
  users: any = [];

  ruleModels: any = [];

  ngOnInit() {
    this.rulesService.getRules().subscribe((value) => {
      this.rules = value;
      this.filteredRules = value;

      this.useCasesService.getUseCases().subscribe((value) => {
        this.useCases = value;

        this.rulesService.getRuleModels().subscribe((value) => {
          this.ruleModels = value;

          this.authService.getUsers().subscribe((value) => {
            this.users = value;

            this.authService.getClients().subscribe((value) => {
              this.clientsFromBd = value;

              this.uniqueClientsName = this.clientsFromBd.map(
                (item: { name: any }) => item.name,
              );
              this.mitreTableGenerate();
              this.clientsTableGenerate();
            });
          });
        });
      });
    });
  }

  selectedClients: any = [];

  applyFilters() {
    if (this.selectedClients.length === 0) {
      console.log('no clients selected');
      this.filteredRules = this.rules;
    } else {
      this.filteredRules = this.rules.filter(
        (rule: { client: { name: any } }) =>
          this.selectedClients.includes(rule.client.name),
      );
    }
    console.log(this.filteredRules);
  }

  clearSelectedClients() {
    this.selectedClients = [];
    this.filteredRules = this.rules;
  }

  mitreTableGenerate() {
    console.log(this.useCases);
    //get all mitre technique names and number of use cases associated with them. 1 use case has multiple mitre techniques (array)

    this.useCases.forEach((useCase: { mitreTechniques: any }) => {
      useCase.mitreTechniques.forEach((mitreTechnique: any) => {
        if (this.mitreTechniques.includes(mitreTechnique) == false) {
          this.mitreTechniques.push(mitreTechnique);
          this.mitreTechniquesCount.push(1);
        } else {
          var index = this.mitreTechniques.indexOf(mitreTechnique);
          this.mitreTechniquesCount[index] =
            this.mitreTechniquesCount[index] + 1;
        }
      });
    });

    //order both arrays by count
    var temp = [];
    for (var i = 0; i < this.mitreTechniques.length; i++) {
      temp.push({
        mitreTechnique: this.mitreTechniques[i],
        count: this.mitreTechniquesCount[i],
      });
    }
    temp.sort(function (a, b) {
      return b.count - a.count;
    });
    for (var i = 0; i < temp.length; i++) {
      this.mitreTechniques[i] = temp[i].mitreTechnique;
      this.mitreTechniquesCount[i] = temp[i].count;
    }
  }

  clientsTableGenerate() {
    //generate statistic around client name and number of rules. 1 rule has 1 client and client object has a name, etc.
    //make an object with client.name and count. in the same object

    this.rules.forEach((rule: { client: any }) => {
      if (this.clients.includes(rule.client.name) == false) {
        this.clients.push(rule.client.name);
        this.clientsCount.push(1);
      } else {
        var index = this.clients.indexOf(rule.client.name);
        this.clientsCount[index] = this.clientsCount[index] + 1;
      }
    });
  }
}

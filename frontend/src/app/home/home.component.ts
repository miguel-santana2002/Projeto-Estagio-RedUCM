import { Component, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { DataService } from '../services/data.service';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../layout/header/header.component';
import { TitlebannerComponent } from '../layout/titlebanner/titlebanner.component';
import {
  ChartComponent,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexTitleSubtitle,
  ApexStroke,
  ApexGrid,
} from 'ng-apexcharts';
import ApexCharts from 'apexcharts';
import { AuthService } from '../services/auth.service';
import { UsecasesService } from '../services/usecases.service';
import { RulesService } from '../services/rules.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  imports: [CommonModule, HeaderComponent, TitlebannerComponent, RouterModule],
})
export class HomeComponent implements OnInit {
  user: any = { username: '', companies: [] };
  constructor(
    private dataService: DataService,
    private authService: AuthService,
    private useCasesService: UsecasesService,
    private rulesService: RulesService,
  ) {}
  numberOfUseCases: number = 0;
  numberOfRules: number = 0;
  numberOfRuleModels: number = 0;

  ngOnInit() {
    this.authService.loggedInInfo().subscribe((value) => {
      var temp: string = value.toString();
      this.user = value;
      if (this.user.companies == null) {
        this.user.companies = [];
      }

      console.log(this.user);

      this.useCasesService.getUseCases().subscribe((value) => {
        this.numberOfUseCases = value.length;

        this.rulesService.getRules().subscribe((value) => {
          this.numberOfRules = (value as any).length;

          this.rulesService.getRuleModels().subscribe((value) => {
            this.numberOfRuleModels = (value as any).length;
          });
        });
      });
    });
  }

  get userRoleLabel(): string {
    return this.user?.is_superuser || this.user?.is_admin
      ? 'Administrador'
      : 'Operador';
  }
}

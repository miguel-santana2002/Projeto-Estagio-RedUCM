import { CommonModule } from "@angular/common";
import { Component, ViewChild } from "@angular/core";

import {
  ApexAxisChartSeries,
  ApexTitleSubtitle,
  ApexChart,
  ApexXAxis,
  ChartComponent,
  NgApexchartsModule
} from "ng-apexcharts";
import { UsecasesService } from "../../services/usecases.service";
import { RulesService } from "../../services/rules.service";

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  title: ApexTitleSubtitle;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
};

@Component({
  selector: 'app-radar-tactics',
  standalone: true,
  imports: [CommonModule,NgApexchartsModule],
  templateUrl: './radar-tactics.component.html',
  styleUrl: './radar-tactics.component.css'
})
export class RadarTacticsComponent {
tacticsCount : any = [];
useCases : any = [];
allTactics: string[] = [
  "Execution",
  "Persistence",
  "Privilege Escalation",
  "Defense Evasion",
  "Credential Access",
  "Discovery",
  "Lateral Movement",
  "Collection",
  "Exfiltration",
  "Command and Control",
  "Impact",
];

ngOnInit() {
this.useCasesService.getUseCases().subscribe((data) => {
  this.useCases = data;
  console.log(this.useCases);

var ids : any = [];
  this.useCases.forEach((useCase: any) => {
    useCase.mitreTechniques.forEach((mitreTechnique: any) => {
      ids.push(mitreTechnique);
    });
  });

  this.useCasesService.getTechniqueTacticBasedOnListIds(ids).subscribe((data) => {
    console.log(data);

this.tacticsCount = data;

 // Inicializar objeto de contagem com todas as táticas
 let tacticCounts: { [key: string]: number } = {};
 this.allTactics.forEach((tactic) => {
   tacticCounts[tactic] = 0;
 });

 // Atualizar contagens reais
 this.tacticsCount.forEach((item : any) => {
   tacticCounts[item.tactic] = item.count;
 });

 // Extrair contagens em ordem das táticas
 const seriesData = this.allTactics.map((tactic) => tacticCounts[tactic]);

 // Atualizar as séries e categorias do gráfico
 this.chartOptions.series = [{ data: seriesData }];
 this.chartOptions.xaxis = { categories: this.allTactics };
});
});
}

  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions: Partial<ChartOptions>;

  constructor(private useCasesService : UsecasesService, private rulesService: RulesService) {
    this.chartOptions = {
      series: [
        {
          name: "Series 1",
          data: [80, 50, 30, 40, 100, 20],
        }
      ],
      chart: {
        height: 260,
        type: "radar",
        toolbar: {
          show: false
        }
      },
      title: {
        text: "Basic Radar Chart"
      },
      xaxis: {
        categories: ["Por preencher"]
      }
     
    };
  }
}

import { CommonModule } from "@angular/common";
import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from "@angular/core";

import {
  ApexAxisChartSeries,
  ApexTitleSubtitle,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
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
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './radar-tactics.component.html',
  styleUrl: './radar-tactics.component.css'
})
export class RadarTacticsComponent implements OnInit, OnChanges {
  @Input() useCases: any[] = [];
  tacticsCount: any = [];
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

  ngOnInit(): void {
    if (this.useCases && this.useCases.length > 0) {
      this.loadTacticsFromUseCases(this.useCases);
    } else {
      this.useCasesService.getUseCases().subscribe({
        next: (data: any) => {
          this.useCases = Array.isArray(data) ? data : [];
          this.loadTacticsFromUseCases(this.useCases);
        },
        error: (err) => console.error('Erro ao carregar use cases no radar:', err)
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['useCases'] && changes['useCases'].currentValue && changes['useCases'].currentValue.length > 0) {
      this.loadTacticsFromUseCases(changes['useCases'].currentValue);
    }
  }

  private loadTacticsFromUseCases(useCasesList: any[]): void {
    const ids: string[] = [];
    useCasesList.forEach((useCase: any) => {
      if (Array.isArray(useCase.mitreTechniques)) {
        useCase.mitreTechniques.forEach((technique: any) => {
          const id =
            typeof technique === 'string'
              ? technique
              : technique?.id || technique?.name;
          if (id) {
            ids.push(id);
          }
        });
      }
    });

    if (ids.length === 0) {
      return;
    }

    this.useCasesService.getTechniqueTacticBasedOnListIds(ids).subscribe({
      next: (data: any) => {
        this.tacticsCount = Array.isArray(data) ? data : [];

        // Inicializar objeto de contagem com todas as táticas
        const tacticCounts: { [key: string]: number } = {};
        this.allTactics.forEach((tactic) => {
          tacticCounts[tactic] = 0;
        });

        // Atualizar contagens reais
        this.tacticsCount.forEach((item: any) => {
          if (item && item.tactic) {
            tacticCounts[item.tactic] = item.count || 0;
          }
        });

        // Extrair contagens em ordem das táticas
        const seriesData = this.allTactics.map((tactic) => tacticCounts[tactic]);

        // Atualizar as séries e categorias do gráfico
        this.chartOptions.series = [{ name: "Casos de Uso", data: seriesData }];
        this.chartOptions.xaxis = { categories: this.allTactics };
      },
      error: (err) => console.error('Erro ao carregar táticas MITRE:', err)
    });
  }

  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions: Partial<ChartOptions>;

  constructor(private useCasesService: UsecasesService, private rulesService: RulesService) {
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
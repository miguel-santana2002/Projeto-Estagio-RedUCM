import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import ApexCharts from 'apexcharts';

@Component({
  selector: 'app-rules-per-logsource',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rules-per-logsource.component.html',
  styleUrl: './rules-per-logsource.component.css',
})
export class RulesPerLogsourceComponent implements OnChanges, OnDestroy {
  @Input() rules: any;
  @ViewChild('chartElementtwo') chartElement!: ElementRef;
  private chart!: ApexCharts;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rules'] && changes['rules'].currentValue) {
      setTimeout(() => {
        if (this.chartElement && this.chartElement.nativeElement) {
          this.renderChart(changes['rules'].currentValue);
        }
      }, 0);
    }
  }

  renderChart(rulesData: any[]): void {
    if (!Array.isArray(rulesData) || rulesData.length === 0) {
      if (this.chart) {
        this.chart.destroy();
      }
      return;
    }

    // 1. Extração segura (pesquisa em rule.logsources ou rule.ruleModel.logsources com proteção contra nulos)
    const rulesLogsource = rulesData
      .flatMap(
        (rule: any) => rule.logsources ?? rule.ruleModel?.logsources ?? [],
      )
      .filter((log: string | undefined): log is string => Boolean(log));

    if (rulesLogsource.length === 0) {
      if (this.chart) {
        this.chart.destroy();
      }
      return;
    }

    // 2. Agregação e contagem
    const rulesLogsourcePercentage = rulesLogsource.reduce(
      (acc: Record<string, number>, curr: string) => {
        acc[curr] = (acc[curr] || 0) + 1;
        return acc;
      },
      {},
    );

    const rulesLogsourcePercentageArray = Object.values(
      rulesLogsourcePercentage,
    );
    const rulesLogsourcePercentageArrayLabels = Object.keys(
      rulesLogsourcePercentage,
    );

    const options: any = {
      series: rulesLogsourcePercentageArray,
      colors: [
        '#1C64F2',
        '#16BDCA',
        '#05c5a4',
        '#6ac669',
        '#ffa600',
        '#006400',
      ],
      chart: {
        height: 420,
        width: '100%',
        type: 'pie',
      },
      stroke: {
        colors: ['white'],
        lineCap: '',
      },
      plotOptions: {
        pie: {
          labels: {
            show: true,
          },
        },
      },
      labels: rulesLogsourcePercentageArrayLabels,
      legend: {
        position: 'bottom',
      },
    };

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new ApexCharts(this.chartElement.nativeElement, options);
    this.chart.render();
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }
}

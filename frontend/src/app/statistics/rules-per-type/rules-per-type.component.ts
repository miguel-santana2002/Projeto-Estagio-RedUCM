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
  selector: 'app-rules-per-type',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rules-per-type.component.html',
  styleUrl: './rules-per-type.component.css',
})
export class RulesPerTypeComponent implements OnChanges, OnDestroy {
  @Input() rules: any;
  @ViewChild('chartElementthree') chartElement!: ElementRef;
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

    // 1. Extração segura de tipos das regras (direto ou legado)
    const rulesType = rulesData
      .map((rule: any) => rule.type || rule.ruleModel?.type)
      .filter((type: string | undefined): type is string => Boolean(type));

    if (rulesType.length === 0) {
      if (this.chart) {
        this.chart.destroy();
      }
      return;
    }

    // 2. Agregação de contagens
    const rulesTypePercentage = rulesType.reduce((acc: any, curr: string) => {
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {});

    const rulesTypePercentageArray = Object.values(
      rulesTypePercentage,
    ) as number[];
    const rulesTypePercentageArrayLabels = Object.keys(rulesTypePercentage);

    const options: any = {
      series: rulesTypePercentageArray,
      colors: ['#1C64F2', '#16BDCA', '#05c5a4', '#6ac669', '#ffa600'],
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
          size: '100%',
          dataLabels: {
            offset: -25,
          },
        },
      },
      labels: rulesTypePercentageArrayLabels,
      dataLabels: {
        enabled: true,
        style: {
          fontFamily: 'Inter, sans-serif',
        },
      },
      legend: {
        position: 'bottom',
        fontFamily: 'Inter, sans-serif',
      },
      yaxis: {
        labels: {
          formatter: function (value: any) {
            return value + '%';
          },
        },
      },
      xaxis: {
        labels: {
          formatter: function (value: string) {
            return value + '%';
          },
        },
        axisTicks: {
          show: false,
        },
        axisBorder: {
          show: false,
        },
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

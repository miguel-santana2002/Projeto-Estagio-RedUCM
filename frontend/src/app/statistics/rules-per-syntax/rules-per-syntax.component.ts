import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  SimpleChanges,
  ViewChild,
  ElementRef,
  OnChanges,
  OnDestroy,
} from '@angular/core';
import ApexCharts from 'apexcharts';

@Component({
  selector: 'app-rules-per-syntax',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rules-per-syntax.component.html',
  styleUrl: './rules-per-syntax.component.css',
})
export class RulesPerSyntaxComponent implements OnChanges, OnDestroy {
  @Input() rules: any;
  @ViewChild('chartElement') chartElement!: ElementRef;
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

    // 1. Extração segura (prioridade à sintaxe da regra, com fallback para a do modelo)
    const rulesSintax = rulesData
      .map((rule: any) => rule.syntax || rule.ruleModel?.syntax)
      .filter((syntax: string | undefined): syntax is string =>
        Boolean(syntax),
      );

    if (rulesSintax.length === 0) {
      if (this.chart) {
        this.chart.destroy();
      }
      return;
    }

    // 2. Agregação e contagens
    const rulesSintaxPercentage = rulesSintax.reduce(
      (acc: Record<string, number>, curr: string) => {
        acc[curr] = (acc[curr] || 0) + 1;
        return acc;
      },
      {},
    );

    const rulesSintaxPercentageArray = Object.values(rulesSintaxPercentage);
    const rulesSintaxPercentageArrayLabels = Object.keys(rulesSintaxPercentage);

    const options: any = {
      series: rulesSintaxPercentageArray,
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
          size: '100%',
          dataLabels: {
            offset: -25,
          },
        },
      },
      labels: rulesSintaxPercentageArrayLabels,
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

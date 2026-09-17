import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  Input,
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
export class RulesPerTypeComponent implements OnDestroy {
  @Input() rules: any;
  @ViewChild('chartElementthree') chartElement!: ElementRef;
  private chart!: ApexCharts;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['rules'] && changes['rules'].currentValue) {
      setTimeout(() => {
        if (this.chartElement && this.chartElement.nativeElement) {
          this.renderChart(changes['rules'].currentValue);
        }
      }, 0);
    }
  }

  renderChart(rulesData: any) {
    if (rulesData) {
      var rulesType = rulesData.map((rule: any) => rule.ruleModel.type);
      var rulesTypePercentage = rulesType.reduce((acc: any, curr: any) => {
        acc[curr] = (acc[curr] || 0) + 1;
        return acc;
      }, {});
      var rulesTypePercentageArray = Object.keys(rulesTypePercentage).map(
        (key) => {
          return rulesTypePercentage[key];
        },
      );
      var rulesTypePercentageArrayLabels = Object.keys(rulesTypePercentage).map(
        (key) => {
          return key;
        },
      );

      var options = {
        series: rulesTypePercentageArray,
        colors: ['#1C64F2', '#16BDCA', '#05c5a4', '6ac669', 'ffa600'],
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
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }
}

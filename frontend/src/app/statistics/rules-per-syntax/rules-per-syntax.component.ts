import { CommonModule } from '@angular/common';
import { Component, Input, SimpleChanges, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import ApexCharts from 'apexcharts';

@Component({
  selector: 'app-rules-per-syntax',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rules-per-syntax.component.html',
  styleUrl: './rules-per-syntax.component.css'
})
export class RulesPerSyntaxComponent {

  @Input() rules: any;

  @ViewChild('chartElement')
  chartElement!: ElementRef;
  private chart!: ApexCharts;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['rules'] && changes['rules'].currentValue) {
      this.renderChart(changes['rules'].currentValue);
    }
  }

  renderChart(rulesData: any) {
    if (rulesData) {
      var rulesSintax = rulesData.map((rule: any) => rule.syntax);
      var rulesSintaxPercentage = rulesSintax.reduce((acc: any, curr: any) => {
        acc[curr] = (acc[curr] || 0) + 1;
        return acc;
      }, {});
      var rulesSintaxPercentageArray = Object.keys(rulesSintaxPercentage).map((key) => {
        return rulesSintaxPercentage[key];
      });
      var rulesSintaxPercentageArrayLabels = Object.keys(rulesSintaxPercentage).map((key) => {
        return key;
      });

      var options = {
        series: rulesSintaxPercentageArray,
        colors: ["#1C64F2", "#16BDCA", "#05c5a4","#6ac669","#ffa600","#006400"],
        chart: {
          height: 420,
          width: "100%",
          type: "pie",
        },
        stroke: {
          colors: ["white"],
          lineCap: "",
        },
        plotOptions: {
          pie: {
            labels: {
              show: true,
            },
            size: "100%",
            dataLabels: {
              offset: -25
            }
          },
        },
        labels: rulesSintaxPercentageArrayLabels,
        dataLabels: {
          enabled: true,
          style: {
            fontFamily: "Inter, sans-serif",
          },
        },
        legend: {
          position: "bottom",
          fontFamily: "Inter, sans-serif",
        },
        yaxis: {
          labels: {
            formatter: function (value : any) {
              return value + "%"
            },
          },
        },
        xaxis: {
          labels: {
            formatter: function (value: string) {
              return value  + "%"
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

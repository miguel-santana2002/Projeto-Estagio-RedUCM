import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import ApexCharts from 'apexcharts';

@Component({
  selector: 'app-rules-per-logsource',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rules-per-logsource.component.html',
  styleUrl: './rules-per-logsource.component.css'
})
export class RulesPerLogsourceComponent implements OnDestroy {
  @Input() rules: any;
  @ViewChild('chartElementtwo') chartElement!: ElementRef;
  private chart!: ApexCharts;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['rules'] && changes['rules'].currentValue) {
      this.renderChart(changes['rules'].currentValue);
    }
  }

  renderChart(rulesData: any) {
    if (rulesData) {
      const rulesLogsource = rulesData.flatMap((rule: any) => rule.ruleModel.logsources);
      var rulesLogsourcePercentage = rulesLogsource.reduce((acc: any, curr: any) => {
        acc[curr] = (acc[curr] || 0) + 1;
        return acc;
      }, {});
      var rulesLogsourcePercentageArray = Object.keys(rulesLogsourcePercentage).map((key) => {
        return rulesLogsourcePercentage[key];
      });
      var rulesLogsourcePercentageArrayLabels = Object.keys(rulesLogsourcePercentage).map((key) => {
        return key;
      });

      var options = {
        series: rulesLogsourcePercentageArray,
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
          },
        },
        labels: rulesLogsourcePercentageArrayLabels,
        legend: {
          position: "bottom",
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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, ViewChild } from '@angular/core';
import { Chart, ChartConfiguration, ChartData, ChartOptions } from 'chart.js';
import { HttpClient } from '@angular/common/http';
import { BaseChartDirective } from 'ng2-charts';
@Component({
  selector: 'app-meteo',
  standalone: false,
  templateUrl: './meteo.component.html',
  styleUrl: './meteo.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush

})


export class MeteoComponent implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  rawData: any;
  @Input()
  lat: Number = 0.0
  @Input()
  lon: Number = 0.0
  selectedDayIndex: number = 0;

  chartData: any = {
    labels: [],
    datasets: [
      {
        label: 'Température (°C)',
        data: [],
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        borderColor: 'rgba(59, 130, 246, 1)',
        yAxisID: 'y',
        type: 'bar'
      },
      {
        label: 'Nuages (%)',
        data: [],
        backgroundColor: 'rgba(156, 163, 175, 0.3)',
        borderColor: 'rgba(107, 114, 128, 1)',
        yAxisID: 'y1',
        type: 'line',
        tension: 0.4,
        borderWidth: 2,
        fill: true
      },
      {
        label: 'Ensoleillement (h)',
        data: [],
        backgroundColor: 'rgba(253, 224, 71, 0.3)',
        borderColor: 'rgba(202, 138, 4, 1)',
        yAxisID: 'y2',
        type: 'line',
        tension: 0.4,
        borderWidth: 2,
        fill: true
      }
    ]
  };
  currentHour: Number = 0;
  chartOptions: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Température (°C)' } },
      y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Nuages (%)' } },
      y2: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Soleil (h)' } }
    }
  };

  constructor(private http: HttpClient) { }

  ngOnInit() {
    const image = new Image();
    image.src = 'assets/images/logo.png'; // Replace with the path to your logo
    image.onload = () => {

      const backgroundLogoPlugin = {
        id: 'backgroundLogo',
        beforeDraw: (chart: any) => {
          const { width, height, left, top } = chart.chartArea;
          const ctx = chart.ctx;

          // Draw the logo at the center of the chart
          const x = left + (width - image.width) / 2;
          const y = top + (height - image.height) / 2;

          ctx.save();
          ctx.globalAlpha = 0.25; // Adjust transparency
          ctx.drawImage(image, x, y, image.width, image.height);
          ctx.restore();
        },
      };

      // Register the plugin
      Chart.register(backgroundLogoPlugin);


    }
    this.fetchWeatherData(this.lat, this.lon);

  }

  fetchWeatherData(lat: Number, lon: Number) {


    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,cloudcover,direct_radiation&forecast_days=5&timezone=auto`;
    console.log(url);

    this.http.get(url).subscribe((data: any) => {
      this.rawData = data;
      this.setCurrentHour(data.timezone);
      this.updateChartForDay(0);
    });
  }
  setCurrentHour(timezone: string) {
    const currentDate = new Date();

    // Nous utilisons ici le fuseau horaire renvoyé par l'API Open-Meteo (timezone)
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };

    // Calcul de l'heure locale selon le fuseau horaire de la latitude/longitude
    const timeInCurrentZone = currentDate.toLocaleString('en-US', options);
    const currentHour = timeInCurrentZone.split(':')[0]// Extraire l'heure et ajouter "h"

    // Mettre à jour la variable de l'heure actuelle
    this.currentHour = Number(currentHour);
    console.log(this.currentHour);

  }


  updateChartForDay(dayIndex: number) {
    this.selectedDayIndex = dayIndex;

    const startHour = dayIndex * 24;
    const endHour = startHour + 24;

    const temps = this.rawData.hourly.temperature_2m.slice(startHour, endHour);
    const clouds = this.rawData.hourly.cloudcover.slice(startHour, endHour);
    const sun = this.rawData.hourly.direct_radiation
      .slice(startHour, endHour)
      .map((r: number): number => parseFloat((r / 100).toFixed(1)));

    const labels = this.rawData.hourly.time
      .slice(startHour, endHour)
      .map((t: string): string => new Date(t).getHours() + 'h');

    this.chartData.labels = labels;
    this.chartData.datasets[0].data = temps;
    this.chartData.datasets[1].data = clouds;
    this.chartData.datasets[2].data = sun;


    if (dayIndex == 0) {


      this.chartData.datasets[0].backgroundColor = temps.map((_: number, i: number): string =>
        i === this.currentHour ? 'rgba(30, 64, 175, 0.9)' : 'rgba(59, 130, 246, 0.3)'
      );


    }
    else {
      this.chartData.datasets[0].backgroundColor = temps.map((_: number, i: number): string =>
        i === this.currentHour ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.3)'
      )
    }

    // 🟦 Bar highlight for current hour (Température)




    this.chart?.update();
  }


}

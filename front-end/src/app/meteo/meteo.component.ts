import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { Chart, ChartConfiguration } from 'chart.js';
import { ThemeService } from '../services/theme.service';
import { baseOptions, chartTokens, token } from '../services/chart-theme';

interface Forecast {
  timezone: string;
  hourly: {
    time: string[];
    temperature_2m: number[];
    cloudcover: number[];
    direct_radiation: number[];
  };
}

const HOURS_PER_DAY = 24;
const FORECAST_DAYS = 5;

/**
 * Fixed reference ranges used to bring three different units onto one axis.
 *
 * They are deliberately fixed rather than derived from the data: scaling each
 * series to its own min/max would stretch a 3 °C overnight drift to look like
 * the same swing as 0–100% cloud, which is exactly the distortion this chart
 * is meant to avoid.
 */
const SCALES = {
  temperature: { min: -30, max: 40, unit: '°C', digits: 1 },
  cloud: { min: 0, max: 100, unit: '%', digits: 0 },
  radiation: { min: 0, max: 1, unit: 'kW/m²', digits: 2 },
};

/**
 * Five-day forecast on a single indexed chart.
 *
 * The original drew temperature, cloud and sunlight on three separate y-axes.
 * Multiple scales on one plot make crossings meaningless — two lines appear to
 * intersect only because of how their axes happened to be scaled — so this
 * instead maps all three onto one 0–100 index against fixed reference ranges,
 * and reports the true value with its unit in the tooltip.
 */
@Component({
  selector: 'app-meteo',
  standalone: false,
  templateUrl: './meteo.component.html',
})
export class MeteoComponent implements OnInit, OnDestroy {
  @Input() lat = 0;
  @Input() lon = 0;

  selectedDayIndex = 0;
  loading = true;
  failed = false;

  readonly days = Array.from({ length: FORECAST_DAYS }, (_, i) => i + 1);

  private forecast: Forecast | null = null;
  private currentHour = 0;
  private chart?: Chart;
  private canvas?: HTMLCanvasElement;
  private readonly subscriptions = new Subscription();

  @ViewChild('meteoCanvas')
  set meteoCanvas(ref: ElementRef<HTMLCanvasElement> | undefined) {
    this.canvas = ref?.nativeElement;
    if (this.canvas && this.forecast) this.renderDay(this.selectedDayIndex);
  }

  constructor(
    private http: HttpClient,
    private theme: ThemeService
  ) {}

  ngOnInit(): void {
    this.fetchForecast();
    this.subscriptions.add(
      this.theme.changes().subscribe(() => this.renderDay(this.selectedDayIndex))
    );
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.subscriptions.unsubscribe();
  }

  private fetchForecast(): void {
    const url =
      'https://api.open-meteo.com/v1/forecast' +
      `?latitude=${this.lat}&longitude=${this.lon}` +
      `&hourly=temperature_2m,cloudcover,direct_radiation&forecast_days=${FORECAST_DAYS}&timezone=auto`;

    this.http.get<Forecast>(url).subscribe({
      next: (data) => {
        this.forecast = data;
        this.currentHour = this.localHour(data.timezone);
        this.loading = false;
        this.renderDay(0);
      },
      error: () => {
        this.loading = false;
        this.failed = true;
      },
    });
  }

  /** Current hour in the location's own timezone, as reported by the forecast. */
  private localHour(timezone: string): number {
    const formatted = new Date().toLocaleString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      hour12: false,
    });
    return Number(formatted.split(':')[0]) || 0;
  }

  updateChartForDay(dayIndex: number): void {
    this.renderDay(dayIndex);
  }

  /** Maps a real measurement onto the shared 0–100 index. */
  private index(value: number, scale: { min: number; max: number }): number {
    return ((value - scale.min) / (scale.max - scale.min)) * 100;
  }

  private renderDay(dayIndex: number): void {
    if (!this.forecast || !this.canvas) return;
    this.selectedDayIndex = dayIndex;

    const t = chartTokens();
    const series3 = token('--series-3');
    const start = dayIndex * HOURS_PER_DAY;
    const end = start + HOURS_PER_DAY;
    const { hourly } = this.forecast;

    const labels = hourly.time.slice(start, end).map((time) => new Date(time).getHours() + 'h');

    // Raw values are kept so the tooltip can report the real measurement.
    const raw = {
      temperature: hourly.temperature_2m.slice(start, end),
      cloud: hourly.cloudcover.slice(start, end),
      radiation: hourly.direct_radiation.slice(start, end).map((w) => w / 1000),
    };

    // A visible marker on "now", but only on today's tab.
    const markNow = (ctx: { dataIndex: number }) =>
      dayIndex === 0 && ctx.dataIndex === this.currentHour ? 5 : 0;

    const series = [
      { key: 'temperature' as const, label: 'Température', colour: t.series1, fill: false },
      { key: 'cloud' as const, label: 'Couverture nuageuse', colour: t.series2, fill: true },
      { key: 'radiation' as const, label: 'Rayonnement direct', colour: series3, fill: true },
    ];

    this.chart?.destroy();
    const options = baseOptions(t) as ChartConfiguration['options'];

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: series.map((s) => ({
          label: `${s.label} (${SCALES[s.key].unit})`,
          data: raw[s.key].map((v) => this.index(v, SCALES[s.key])),
          borderColor: s.colour,
          backgroundColor: s.fill
            ? `color-mix(in oklab, ${s.colour} 14%, transparent)`
            : s.colour,
          borderWidth: 2,
          tension: 0.35,
          pointRadius: markNow,
          pointHoverRadius: 5,
          pointBackgroundColor: s.colour,
          fill: s.fill,
        })),
      },
      options: {
        ...options,
        plugins: {
          ...options!.plugins,
          tooltip: {
            ...options!.plugins!.tooltip,
            callbacks: {
              // Report the measurement, never the index — the axis is only a
              // device for putting three units on one plot.
              label: (item) => {
                const key = series[item.datasetIndex].key;
                const scale = SCALES[key];
                const value = raw[key][item.dataIndex];
                return ` ${series[item.datasetIndex].label} : ${value.toFixed(scale.digits)} ${scale.unit}`;
              },
            },
          },
        },
        scales: {
          ...options!.scales,
          y: {
            ...options!.scales!['y'],
            min: 0,
            max: 100,
            ticks: { ...options!.scales!['y']!.ticks, callback: (v) => `${v}` },
            title: { display: true, text: 'Échelle relative', color: t.inkMuted },
          },
        },
      } as ChartConfiguration<'line'>['options'],
    };

    this.chart = new Chart(this.canvas, config);
  }
}

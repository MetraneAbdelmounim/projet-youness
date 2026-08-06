import { Component, ElementRef, Input, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { Chart, ChartConfiguration } from 'chart.js';
import { ThemeService } from '../services/theme.service';
import { baseOptions, chartTokens } from '../services/chart-theme';

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
 * Five-day forecast, drawn as three stacked single-measure panels.
 *
 * This replaces one chart that carried temperature, cloud cover and sunlight on
 * three separate y-axes. Multiple scales on one plot make the crossings
 * meaningless — two lines appear to intersect only because of how the axes were
 * scaled. Small multiples keep every comparison honest and let each panel keep
 * its own units.
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
  readonly panels = [
    { key: 'temp' as const, title: 'Température', unit: '°C', kind: 'bar' as const },
    { key: 'cloud' as const, title: 'Couverture nuageuse', unit: '%', kind: 'line' as const },
    { key: 'sun' as const, title: 'Rayonnement direct', unit: 'kW/m²', kind: 'line' as const },
  ];

  private forecast: Forecast | null = null;
  private currentHour = 0;
  private charts = new Map<string, Chart>();
  private canvases = new Map<string, HTMLCanvasElement>();
  private readonly subscriptions = new Subscription();

  @ViewChildren('panelCanvas')
  set panelCanvases(refs: QueryList<ElementRef<HTMLCanvasElement>> | undefined) {
    if (!refs?.length) return;
    refs.forEach((ref, index) => {
      const key = this.panels[index]?.key;
      if (key) this.canvases.set(key, ref.nativeElement);
    });
    if (this.forecast) this.renderDay(this.selectedDayIndex);
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
    this.charts.forEach((chart) => chart.destroy());
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

  private renderDay(dayIndex: number): void {
    if (!this.forecast) return;
    this.selectedDayIndex = dayIndex;

    const t = chartTokens();
    const start = dayIndex * HOURS_PER_DAY;
    const end = start + HOURS_PER_DAY;
    const { hourly } = this.forecast;

    const labels = hourly.time.slice(start, end).map((time) => new Date(time).getHours() + 'h');

    const series = {
      temp: hourly.temperature_2m.slice(start, end),
      cloud: hourly.cloudcover.slice(start, end),
      sun: hourly.direct_radiation
        .slice(start, end)
        .map((value) => parseFloat((value / 1000).toFixed(2))),
    };

    for (const panel of this.panels) {
      const canvas = this.canvases.get(panel.key);
      if (!canvas) continue;

      this.charts.get(panel.key)?.destroy();

      const data = series[panel.key];
      // Highlight the current hour, but only on today's tab.
      const highlight = data.map((_, hour) =>
        dayIndex === 0 && hour === this.currentHour ? t.series2 : t.series1
      );

      const options = baseOptions(t) as ChartConfiguration['options'];

      const chartConfig: ChartConfiguration = {
        type: panel.kind,
        data: {
          labels,
          datasets: [
            {
              label: `${panel.title} (${panel.unit})`,
              data,
              backgroundColor: panel.kind === 'bar' ? highlight : `color-mix(in oklab, ${t.series1} 18%, transparent)`,
              borderColor: t.series1,
              borderWidth: panel.kind === 'line' ? 2 : 0,
              borderRadius: panel.kind === 'bar' ? 3 : 0,
              maxBarThickness: 18,
              pointRadius: 0,
              tension: 0.35,
              fill: panel.kind === 'line',
            },
          ],
        },
        options: {
          ...options,
          plugins: {
            ...options!.plugins,
            // A single series needs no legend box — the panel title names it.
            legend: { display: false },
          },
          scales: {
            ...options!.scales,
            y: {
              ...options!.scales!['y'],
              title: { display: true, text: panel.unit, color: t.inkMuted },
            },
          },
        },
      };

      this.charts.set(panel.key, new Chart(canvas, chartConfig));
    }
  }
}

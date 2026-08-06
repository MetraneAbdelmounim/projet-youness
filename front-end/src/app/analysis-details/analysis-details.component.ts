import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subscription, forkJoin } from 'rxjs';
import { Chart, ChartConfiguration } from 'chart.js';
import { HistoryPoint, Site } from '../models/site';
import { SiteService } from '../services/site.service';
import { ThemeService } from '../services/theme.service';
import { baseOptions, chartTokens } from '../services/chart-theme';

const HISTORY_WINDOWS = [
  { label: '24 h', hours: 24 },
  { label: '7 jours', hours: 24 * 7 },
  { label: '30 jours', hours: 24 * 30 },
];

@Component({
  selector: 'app-analysis-details',
  standalone: false,
  templateUrl: './analysis-details.component.html',
})
export class AnalysisDetailsComponent implements OnInit, OnDestroy {
  site: Site | null = null;
  history: HistoryPoint[] = [];
  loading = true;

  readonly windows = HISTORY_WINDOWS;
  selectedHours = 24;

  private chart?: Chart;
  private canvas?: HTMLCanvasElement;
  private readonly subscriptions = new Subscription();

  /**
   * Fires the moment *ngIf inserts the canvas, which is the only reliable
   * point at which it can be drawn to.
   *
   * Scheduling the first render from the data callback did not work: the canvas
   * is behind `*ngIf="!loading"`, so at that point Angular had not yet rendered
   * it and the lookup found nothing — the chart stayed blank until some later
   * event forced a redraw.
   */
  @ViewChild('historyCanvas')
  set historyCanvas(ref: ElementRef<HTMLCanvasElement> | undefined) {
    this.canvas = ref?.nativeElement;
    if (this.canvas) this.renderChart();
  }

  constructor(
    private siteService: SiteService,
    private route: ActivatedRoute,
    private message: ToastrService,
    private theme: ThemeService
  ) {}

  ngOnInit(): void {
    const siteId = this.route.snapshot.paramMap.get('idSite');
    if (!siteId) {
      this.loading = false;
      return;
    }

    forkJoin({
      site: this.siteService.getSiteById(siteId),
      history: this.siteService.getHistory(siteId, this.selectedHours),
    }).subscribe({
      next: ({ site, history }) => {
        this.site = site;
        this.history = history;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.message.error('Impossible de charger la station');
      },
    });

    // Chart colours come from CSS tokens, so a theme change means a repaint.
    this.subscriptions.add(this.theme.changes().subscribe(() => this.renderChart()));
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.subscriptions.unsubscribe();
  }

  selectWindow(hours: number): void {
    if (!this.site || hours === this.selectedHours) return;
    this.selectedHours = hours;

    this.siteService.getHistory(this.site._id, hours).subscribe({
      next: (history) => {
        this.history = history;
        this.renderChart();
      },
      error: () => this.message.error("Impossible de charger l'historique"),
    });
  }

  /**
   * Plots battery and array voltage over the selected window.
   *
   * Both series are volts, so they share one axis — the comparison between them
   * is meaningful precisely because the scale is common. This view only became
   * possible once readings were retained; the station document holds a single
   * latest value, so there was previously nothing to draw a trend from.
   */
  private renderChart(): void {
    if (!this.canvas) return;

    this.chart?.destroy();
    const t = chartTokens();
    const options = baseOptions(t) as ChartConfiguration['options'];

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: this.history.map((point) => new Date(point.ts).toLocaleString('fr-CA')),
        datasets: [
          {
            label: 'Tension batterie',
            data: this.history.map((point) => point.Battery_Voltage),
            borderColor: t.series1,
            backgroundColor: t.series1,
            borderWidth: 2,
            tension: 0.25,
            pointRadius: 0,
            pointHoverRadius: 4,
            spanGaps: true,
          },
          {
            label: 'Tension panneau',
            data: this.history.map((point) => point.Array_Voltage),
            borderColor: t.series2,
            backgroundColor: t.series2,
            borderWidth: 2,
            tension: 0.25,
            pointRadius: 0,
            pointHoverRadius: 4,
            spanGaps: true,
          },
        ],
      },
      options: {
        ...options,
        scales: {
          ...options!.scales,
          y: {
            ...options!.scales!['y'],
            beginAtZero: false,
            title: { display: true, text: 'Volts', color: t.inkMuted },
          },
          x: { ...options!.scales!['x'], ticks: { ...options!.scales!['x']!.ticks, maxTicksLimit: 10 } },
        },
      } as ChartConfiguration<'line'>['options'],
    };

    this.chart = new Chart(this.canvas, config);
  }
}

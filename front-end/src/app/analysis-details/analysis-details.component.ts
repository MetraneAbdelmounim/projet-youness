import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { TranslationKey } from '../i18n/fr';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { I18nService } from '../i18n/i18n.service';
import { Subscription, forkJoin } from 'rxjs';
import { Chart, ChartConfiguration } from 'chart.js';
import { HistoryPoint, Site } from '../models/site';
import { SiteService } from '../services/site.service';
import { ThemeService } from '../services/theme.service';
import { baseOptions, chartTokens } from '../services/chart-theme';

const HISTORY_WINDOWS: { label: TranslationKey; hours: number }[] = [
  { label: 'details.range24h', hours: 24 },
  { label: 'details.range7d', hours: 24 * 7 },
  { label: 'details.range30d', hours: 24 * 30 },
];

/**
 * How much larger than the usual sampling interval a hole must be to count as
 * an outage rather than one late poll.
 */
const GAP_FACTOR = 2.5;

/** Floor for the gap threshold, so ordinary jitter cannot shred the line. */
const MIN_GAP_MS = 2 * 60 * 1000;

/** A plotted sample; `y: null` marks a break where the station was silent. */
type Point = { x: number; y: number | null };

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
    private theme: ThemeService,
    private i18n: I18nService
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
      error: () => this.message.error(this.i18n.t('details.historyFailed')),
    });
  }

  /**
   * The longest hole that still counts as normal sampling.
   *
   * Derived from the data rather than hard-coded, so changing the poll cadence
   * in Administration → Paramètres does not silently turn every interval into
   * an apparent outage. The median is used because it ignores the outages
   * themselves, which a mean would be dragged upwards by.
   */
  private gapThreshold(): number {
    const deltas: number[] = [];
    for (let i = 1; i < this.history.length; i++) {
      const delta = +new Date(this.history[i].ts) - +new Date(this.history[i - 1].ts);
      if (delta > 0) deltas.push(delta);
    }
    if (!deltas.length) return MIN_GAP_MS;

    deltas.sort((a, b) => a - b);
    const median = deltas[Math.floor(deltas.length / 2)];
    return Math.max(median * GAP_FACTOR, MIN_GAP_MS);
  }

  /**
   * Turns readings into plot points, inserting a null wherever the station went
   * silent.
   *
   * Nothing is written to the history while a station is unreachable, so an
   * outage is simply an absence of rows. Chart.js joins consecutive points
   * regardless of how far apart they are in time, which drew a confident
   * straight line straight through the downtime — the outage looked like a
   * smooth trend. An explicit null at the hole breaks the line instead.
   */
  private toSeries(pick: (p: HistoryPoint) => number | null): Point[] {
    const threshold = this.gapThreshold();
    const points: Point[] = [];

    this.history.forEach((reading, index) => {
      const x = +new Date(reading.ts);

      if (index > 0) {
        const previous = +new Date(this.history[index - 1].ts);
        if (x - previous > threshold) points.push({ x: previous + (x - previous) / 2, y: null });
      }

      points.push({ x, y: pick(reading) });
    });

    return points;
  }

  /**
   * Radius for each point.
   *
   * A reading with an outage on both sides has no neighbour to draw a segment
   * to, so with a line alone it would be invisible — exactly the case during
   * the flapping this chart exists to reveal. Those get a dot; the rest stay
   * clean.
   */
  private pointRadius(points: Point[]): (ctx: { dataIndex: number }) => number {
    const isolated = points.map((point, index) => {
      if (point.y === null) return false;
      const before = points[index - 1];
      const after = points[index + 1];
      return (!before || before.y === null) && (!after || after.y === null);
    });
    return (ctx) => (isolated[ctx.dataIndex] ? 2.5 : 0);
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

    const battery = this.toSeries((p) => p.Battery_Voltage);
    const array = this.toSeries((p) => p.Array_Voltage);

    // Long windows only need the date; a day's worth needs the time of day.
    const spanHours = this.selectedHours;
    const formatX = (value: number) =>
      new Date(value).toLocaleString(this.i18n.locale, {
        month: 'short',
        day: 'numeric',
        ...(spanHours <= 48 ? { hour: '2-digit', minute: '2-digit' } : {}),
      });

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        datasets: [
          {
            label: this.i18n.t('reading.batteryVoltage'),
            data: battery,
            borderColor: t.series1,
            backgroundColor: t.series1,
            borderWidth: 2,
            tension: 0.25,
            pointRadius: this.pointRadius(battery),
            pointHoverRadius: 4,
            // The whole point of this view: never bridge an outage.
            spanGaps: false,
          },
          {
            label: this.i18n.t('reading.arrayVoltage'),
            data: array,
            borderColor: t.series2,
            backgroundColor: t.series2,
            borderWidth: 2,
            tension: 0.25,
            pointRadius: this.pointRadius(array),
            pointHoverRadius: 4,
            spanGaps: false,
          },
        ],
      },
      options: {
        ...options,
        parsing: false,
        plugins: {
          ...options!.plugins,
          tooltip: {
            ...options!.plugins?.tooltip,
            callbacks: {
              ...options!.plugins?.tooltip?.callbacks,
              title: (items) => formatX(Number(items[0]?.parsed?.x)),
            },
          },
        },
        scales: {
          ...options!.scales,
          y: {
            ...options!.scales!['y'],
            beginAtZero: false,
            title: { display: true, text: 'V', color: t.inkMuted },
          },
          // A linear axis of epoch milliseconds, not one category per reading.
          // With categories every sample was one slot wide, so a six-hour
          // outage took the same width as a five-minute interval and the time
          // axis was a lie. Linear keeps the spacing proportional to real time
          // without pulling in a date adapter.
          x: {
            ...options!.scales!['x'],
            type: 'linear',
            // Pinned to the window the operator actually asked for. Left to
            // fit the data, the axis silently zooms to whatever happens to
            // exist — pick "24 h" after a long outage and you get a chart
            // labelled 24 h showing the last twenty minutes. Fixing the bounds
            // makes the missing time visible as empty space, which is the
            // honest answer.
            min: Date.now() - spanHours * 3600 * 1000,
            max: Date.now(),
            ticks: {
              ...options!.scales!['x']!.ticks,
              maxTicksLimit: 8,
              callback: (value) => formatX(Number(value)),
            },
          },
        },
      } as ChartConfiguration<'line'>['options'],
    };

    this.chart = new Chart(this.canvas, config);
  }
}

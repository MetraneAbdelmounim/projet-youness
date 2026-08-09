import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { EMPTY, Subscription, forkJoin } from 'rxjs';
import { catchError, exhaustMap } from 'rxjs/operators';
import { Chart, ChartConfiguration, ChartType } from 'chart.js';
import { refreshWhileVisible } from '../services/auto-refresh';
import { config } from '../../Config/config';
import { Site } from '../models/site';
import { Project } from '../models/project';
import { SiteService } from '../services/site.service';
import { ProjectService } from '../services/project.service';
import { ThemeService } from '../services/theme.service';
import { baseOptions, chartTokens } from '../services/chart-theme';

@Component({
  selector: 'app-dashbord',
  standalone: false,
  templateUrl: './dashbord.component.html',
})
export class DashbordComponent implements OnInit, OnDestroy {
  sites: Site[] = [];
  project: Project | null = null;
  projectId: string | null = null;
  spinnerSite = true;

  itemsPerPage = 10;
  page = 1;
  term = '';
  lastUpdated: Date | null = null;

  private chart?: Chart;
  private canvas?: HTMLCanvasElement;
  private readonly subscriptions = new Subscription();

  /**
   * Draws as soon as *ngIf inserts the canvas. Looking the element up straight
   * after the data arrives is too early — it has not been rendered yet.
   */
  @ViewChild('voltageCanvas')
  set voltageCanvas(ref: ElementRef<HTMLCanvasElement> | undefined) {
    this.canvas = ref?.nativeElement;
    if (this.canvas) this.createChart();
  }

  constructor(
    private siteService: SiteService,
    private projectService: ProjectService,
    private message: ToastrService,
    private route: ActivatedRoute,
    private theme: ThemeService,
    public i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id');
    if (!this.projectId) {
      this.spinnerSite = false;
      return;
    }

    this.load();

    // Chart colours come from CSS tokens, so a theme change means a repaint.
    this.subscriptions.add(this.theme.changes().subscribe(() => this.createChart()));

    // Keep the tiles, table and chart current without a manual refresh.
    this.subscriptions.add(
      refreshWhileVisible()
        .pipe(
          exhaustMap(() =>
            this.siteService.getSitesByProject(this.projectId!).pipe(catchError(() => EMPTY))
          )
        )
        .subscribe((sites) => {
          this.sites = sites;
          this.lastUpdated = new Date();
          this.refreshChartData();
        })
    );
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.subscriptions.unsubscribe();
  }

  private load(): void {
    this.spinnerSite = true;

    forkJoin({
      project: this.projectService.getprojectByID(this.projectId!),
      sites: this.siteService.getSitesByProject(this.projectId!),
    }).subscribe({
      next: ({ project, sites }) => {
        this.project = project;
        this.sites = sites;
        this.lastUpdated = new Date();
        this.spinnerSite = false;
        // The canvas is behind *ngIf; the ViewChild setter draws once it exists.
        // On a refresh the canvas already exists, so draw here too.
        if (this.canvas) this.createChart();
      },
      error: () => {
        this.spinnerSite = false;
        this.message.error('Une erreur est survenue !');
      },
    });
  }

  onRefresh(): void {
    this.load();
  }

  get subtitle(): string {
    if (this.spinnerSite) return this.i18n.t('common.loading');
    return this.i18n.t('dashboard.subtitle', {
      project: this.project?.nom ?? '',
      city: this.project?.ville ?? '',
    });
  }

  get onlineCount(): number {
    return this.sites.filter((s) => s.status).length;
  }

  get offlineCount(): number {
    return this.sites.length - this.onlineCount;
  }

  get onlinePercent(): number {
    return this.sites.length ? Math.round((this.onlineCount / this.sites.length) * 100) : 0;
  }

  /** Stations whose last reading sits below the AGM reference line. */
  get belowThresholdCount(): number {
    return this.sites.filter((s) => {
      const v = s.lastReading?.Battery_Voltage;
      return v != null && v < config.Battery_Max_AGM;
    }).length;
  }

  /**
   * Pushes new values into the existing chart rather than rebuilding it.
   *
   * Recreating a Chart.js instance every refresh restarts its entry animation,
   * so the plot would visibly flash every thirty seconds on a screen somebody
   * is watching. Only a change in the station set warrants a rebuild.
   */
  private refreshChartData(): void {
    if (!this.chart) {
      this.createChart();
      return;
    }

    const labels = this.sites.map((s) => s.nom);
    const previous = (this.chart.data.labels ?? []) as string[];
    if (previous.length !== labels.length || previous.some((n, i) => n !== labels[i])) {
      this.createChart();
      return;
    }

    const t = chartTokens();
    const voltages = this.sites.map((s) => s.lastReading?.Battery_Voltage ?? null);

    this.chart.data.datasets[0].data = voltages;
    this.chart.data.datasets[0].backgroundColor = t.series1;

    const measured = voltages.filter((v): v is number => v !== null);
    const bounds = [...measured, config.Battery_Max_AGM, config.Battery_Max_LTH];
    const scale = this.chart.options.scales?.['y'];
    if (scale && bounds.length) {
      scale.min = Math.floor(Math.min(...bounds) - 1);
      scale.max = Math.ceil(Math.max(...bounds) + 1);
    }

    this.chart.update('none');
  }

  private createChart(): void {
    if (!this.canvas || !this.sites.length) return;

    this.chart?.destroy();
    const t = chartTokens();

    const voltages = this.sites.map((s) => s.lastReading?.Battery_Voltage ?? null);
    const measured = voltages.filter((v): v is number => v !== null);

    // Bounds follow the data with the reference lines always in view. The axis
    // used to be pinned to 9–35 V, which flattened every real trace.
    const bounds = [...measured, config.Battery_Max_AGM, config.Battery_Max_LTH];
    const min = bounds.length ? Math.floor(Math.min(...bounds) - 1) : 0;
    const max = bounds.length ? Math.ceil(Math.max(...bounds) + 1) : 30;

    const options = baseOptions(t) as ChartConfiguration['options'];

    const chartConfig: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: this.sites.map((s) => s.nom),
        datasets: [
          {
            label: this.i18n.t('dashboard.seriesVoltage'),
            data: voltages,
            backgroundColor: t.series1,
            borderRadius: 4,
            borderSkipped: false,
            maxBarThickness: 28,
            order: 3,
          },
          {
            label: this.i18n.t('dashboard.thresholdLithium', { value: config.Battery_Max_LTH }),
            type: 'line' as ChartType,
            data: this.sites.map(() => config.Battery_Max_LTH),
            borderColor: t.series2,
            backgroundColor: t.series2,
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0,
            order: 1,
          },
          {
            label: this.i18n.t('dashboard.thresholdAgm', { value: config.Battery_Max_AGM }),
            type: 'line' as ChartType,
            data: this.sites.map(() => config.Battery_Max_AGM),
            borderColor: t.inkMuted,
            backgroundColor: t.inkMuted,
            borderWidth: 2,
            borderDash: [2, 4],
            pointRadius: 0,
            order: 2,
          },
        ],
      },
      options: {
        ...options,
        scales: {
          ...options!.scales,
          y: { ...options!.scales!['y'], min, max, title: { display: true, text: 'Volts', color: t.inkMuted } },
        },
      },
    };

    this.chart = new Chart(this.canvas, chartConfig);
  }
}

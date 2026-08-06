import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subscription, forkJoin } from 'rxjs';
import { Chart, ChartConfiguration, ChartType } from 'chart.js';
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
    private theme: ThemeService
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
    if (this.spinnerSite) return 'Chargement…';
    return `${this.project?.nom ?? ''} · ${this.project?.ville ?? ''}`;
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
            label: 'Tension batterie',
            data: voltages,
            backgroundColor: t.series1,
            borderRadius: 4,
            borderSkipped: false,
            maxBarThickness: 28,
            order: 3,
          },
          {
            label: `Seuil lithium (${config.Battery_Max_LTH} V)`,
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
            label: `Seuil AGM (${config.Battery_Max_AGM} V)`,
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

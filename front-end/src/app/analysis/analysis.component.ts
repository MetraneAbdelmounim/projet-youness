import { Component, OnDestroy, OnInit } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { EMPTY, Subscription, forkJoin } from 'rxjs';
import { catchError, exhaustMap } from 'rxjs/operators';
import { refreshWhileVisible } from '../services/auto-refresh';
import { buildAnalysisReport } from './analysis-report';
import { Site } from '../models/site';
import { Project } from '../models/project';
import { SiteService } from '../services/site.service';
import { ProjectService } from '../services/project.service';

@Component({
  selector: 'app-analysis',
  standalone: false,
  templateUrl: './analysis.component.html',
  styleUrl: './analysis.component.css',
})
export class AnalysisComponent implements OnInit, OnDestroy {
  project: Project | null = null;
  sites: Site[] = [];
  spinnerSite = true;
  lastUpdated: Date | null = null;

  private readonly subscriptions = new Subscription();

  constructor(
    private siteService: SiteService,
    private projectService: ProjectService,
    private message: ToastrService,
    private router: Router,
    private route: ActivatedRoute,
    public i18n: I18nService
  ) {}

  ngOnInit(): void {
    const projectId = this.route.snapshot.paramMap.get('id');
    if (!projectId) {
      this.spinnerSite = false;
      return;
    }

    // Each station's analysis arrives with the station itself, so the page is
    // complete as soon as this resolves. It previously had to wait for one
    // request per station to report back through an output event before the
    // report button could be enabled.
    forkJoin({
      project: this.projectService.getprojectByID(projectId),
      sites: this.siteService.getSitesByProject(projectId),
    }).subscribe({
      next: ({ project, sites }) => {
        this.project = project;
        this.sites = sites;
        this.lastUpdated = new Date();
        this.spinnerSite = false;
      },
      error: () => {
        this.spinnerSite = false;
        this.message.error(this.i18n.t('common.genericError'));
      },
    });

    // Forecasts and reachability are refreshed by the poller; keep the open
    // page in step instead of showing whatever was true when it was opened.
    this.subscriptions.add(
      refreshWhileVisible()
        .pipe(
          exhaustMap(() =>
            this.siteService.getSitesByProject(projectId).pipe(catchError(() => EMPTY))
          )
        )
        .subscribe((sites) => {
          this.sites = sites;
          this.lastUpdated = new Date();
        })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  trackById(_index: number, site: Site): string {
    return site._id;
  }

  get subtitle(): string {
    if (this.spinnerSite) return this.i18n.t('common.loading');
    return this.i18n.t('home.subtitle', {
      project: this.project?.nom ?? '',
      count: this.sites.length,
    });
  }

  /**
   * Fleet-level performance split, shown as tiles above the cards.
   *
   * Unreachable stations are counted separately rather than under their last
   * known performance — a station that is down has no current forecast, and
   * folding it into "élevée" would overstate the health of the fleet.
   */
  get counts(): { up: number; medium: number; down: number; offline: number } {
    const tally = { up: 0, medium: 0, down: 0, offline: 0 };
    for (const site of this.sites) {
      if (!site.status) {
        tally.offline++;
        continue;
      }
      if (site.lastAnalysis?.performance === 'UP') tally.up++;
      else if (site.lastAnalysis?.performance === 'MEDIUM') tally.medium++;
      else if (site.lastAnalysis?.performance === 'DOWN') tally.down++;
    }
    return tally;
  }

  analysisDetail(idSite: string, idProject: string): void {
    // Plain navigation — the previous full page reload discarded the SPA and
    // re-downloaded the bundle on every drill-down.
    void this.router.navigate(['/project', idProject, 'analysis', idSite]);
  }

  exporting = false;

  /** Renders the printed report; layout lives in analysis-report.ts. */
  generatePDF(projectName: string): void {
    if (this.exporting) return;

    this.exporting = true;
    buildAnalysisReport(projectName, this.sites, this.counts, this.i18n)
      .catch(() => this.message.error(this.i18n.t('analysis.reportFailed')))
      .finally(() => (this.exporting = false));
  }
}

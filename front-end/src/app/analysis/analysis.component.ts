import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { EMPTY, Subscription, forkJoin } from 'rxjs';
import { catchError, exhaustMap } from 'rxjs/operators';
import { refreshWhileVisible } from '../services/auto-refresh';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
    private route: ActivatedRoute
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
        this.message.error('Une erreur est survenue !');
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
    if (this.spinnerSite) return 'Chargement…';
    return `${this.project?.nom ?? ''} · ${this.sites.length} station(s)`;
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

  generatePDF(projectName: string): void {
    const doc = new jsPDF();

    doc.addImage('assets/images/logo.png', 'PNG', 10, 10, 30, 20);
    doc.setFontSize(16);
    doc.setTextColor(40);
    doc.text(`Projet : ${projectName}`, 50, 10);
    doc.text("Rapport d'analyse des stations MPPT/Météo", 50, 20);
    doc.setFontSize(10);
    doc.text('Généré le : ' + new Date().toLocaleString(), 50, 27);

    const body = this.sites.map((site) => {
      const analysis = site.lastAnalysis;
      return [
        site.nom,
        site.ip,
        analysis?.avg_remaining_cloud ?? 'N/A',
        analysis?.remaining_sun_hours ?? 'N/A',
        analysis?.battery_type ?? 'N/A',
        analysis?.battery_capacity_loss ?? 'N/A',
        analysis?.solar_charge_loss_clouds ?? 'N/A',
        analysis?.solar_charge_efficiency ?? 'N/A',
        analysis?.current_battery_voltage ?? 'N/A',
        analysis?.performance ?? 'N/A',
      ];
    });

    autoTable(doc, {
      head: [
        [
          'Nom', 'IP', 'Cloud (%)', 'Sun Hours', 'Type Batterie',
          'Perte Batt.', 'Perte Nuages', 'Efficacité', 'Voltage', 'Performance',
        ],
      ],
      body,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
      margin: { top: 35 },
      didParseCell: (data) => {
        if (data.section !== 'body' || data.column.index !== 9) return;

        const colours: Record<string, [number, number, number]> = {
          UP: [0, 128, 0],
          DOWN: [220, 20, 60],
          MEDIUM: [30, 144, 255],
        };
        const performance = (data.row.raw as string[])[9];
        const colour = colours[performance];
        if (colour) data.cell.styles.textColor = colour;
      },
    });

    doc.save(`[${projectName}]Rapport_sites.pdf`);
  }
}

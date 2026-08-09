import { Component, OnDestroy, OnInit } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { EMPTY, Subscription } from 'rxjs';
import { catchError, exhaustMap } from 'rxjs/operators';
import { Site } from '../models/site';
import { SiteService } from '../services/site.service';
import { refreshWhileVisible } from '../services/auto-refresh';
import { StatusTone } from '../ui/status-chip.component';

/** Web consoles exposed by the equipment at each station. */
const DEVICE_PORTS = [
  { port: 9191, label: 'Modem', icon: '📡', protocol: 'http' },
  { port: 888, label: 'Caméra', icon: '🎥', protocol: 'http' },
  { port: 333, label: 'Web Relay', icon: '🔌', protocol: 'http' },
  { port: 4444, label: 'EMC', icon: '📊', protocol: 'http' },
  { port: 666, label: 'Stuttgart M64', icon: '⚙️', protocol: 'http' },
  { port: 5000, label: 'Capteur BT', icon: '🛰️', protocol: 'https' },
];

interface DeviceLink {
  label: string;
  icon: string;
  url: string;
}

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit, OnDestroy {
  sites: Site[] = [];
  spinnerSite = true;
  projectId: string | null = null;
  lastUpdated: Date | null = null;

  /**
   * Console URLs, built once per load.
   *
   * These must not be computed in a template binding: returning a fresh array
   * each change-detection cycle makes *ngFor discard and rebuild every link,
   * which keeps the page permanently re-rendering.
   */
  private linksBySite = new Map<string, DeviceLink[]>();
  private readonly subscriptions = new Subscription();

  constructor(
    private siteService: SiteService,
    private message: ToastrService,
    private route: ActivatedRoute,
    public i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id');
    if (!this.projectId) {
      this.spinnerSite = false;
      return;
    }

    // One request covers the whole page: stations, telemetry, analysis, status.
    this.siteService.getSitesByProject(this.projectId).subscribe({
      next: (sites) => {
        this.applySites(sites);
        this.spinnerSite = false;
      },
      error: () => {
        this.spinnerSite = false;
        this.message.error('Impossible de charger les stations');
      },
    });

    // Keep the page current. exhaustMap, not switchMap: a slow response must
    // not be cancelled by the next tick, or it never lands at all.
    this.subscriptions.add(
      refreshWhileVisible()
        .pipe(
          exhaustMap(() =>
            this.siteService.getSitesByProject(this.projectId!).pipe(catchError(() => EMPTY))
          )
        )
        // Refreshes are silent: a transient failure must not raise a toast on a
        // screen somebody has left open.
        .subscribe((sites) => this.applySites(sites))
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private applySites(sites: Site[]): void {
    this.sites = sites;
    this.linksBySite = new Map(
      sites.map((site) => [
        site._id,
        DEVICE_PORTS.map((device) => ({
          label: device.label,
          icon: device.icon,
          url: `${device.protocol}://${site.ip}:${device.port}/`,
        })),
      ])
    );
    this.lastUpdated = new Date();
  }

  trackById(_index: number, site: Site): string {
    return site._id;
  }

  get subtitle(): string {
    if (this.spinnerSite) return this.i18n.t('common.loading');
    return this.i18n.t('home.subtitleCounts', {
      count: this.sites.length,
      online: this.sites.filter((s) => s.status).length,
    });
  }

  deviceLinks(site: Site): DeviceLink[] {
    return this.linksBySite.get(site._id) ?? [];
  }

  performanceLabel(site: Site): string {
    const key = (
      { UP: 'analysis.high', MEDIUM: 'analysis.medium', DOWN: 'analysis.low' } as const
    )[site.lastAnalysis?.performance as 'UP' | 'MEDIUM' | 'DOWN'];
    return this.i18n.t(key ?? 'analysis.unknown');
  }

  performanceTone(site: Site): StatusTone {
    return ({ UP: 'good', MEDIUM: 'warn', DOWN: 'crit' }[
      site.lastAnalysis?.performance as 'UP' | 'MEDIUM' | 'DOWN'
    ] ?? 'neutral') as StatusTone;
  }
}

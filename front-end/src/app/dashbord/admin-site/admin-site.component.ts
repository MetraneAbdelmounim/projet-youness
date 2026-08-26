import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { EMPTY, Subscription, forkJoin, timer } from 'rxjs';
import { catchError, exhaustMap, take } from 'rxjs/operators';
import { Site } from '../../models/site';
import { Project } from '../../models/project';
import { SiteService } from '../../services/site.service';
import { ProjectService } from '../../services/project.service';
import { I18nService } from '../../i18n/i18n.service';

/**
 * How long, and how often, to re-check a station after a restart.
 * The check is reachability-only server-side, so it returns in a second or two
 * and a short interval is affordable.
 */
const RECOVERY_WATCH_MS = 3 * 60 * 1000;
const RECOVERY_POLL_MS = 4 * 1000;

@Component({
  selector: 'app-admin-site',
  standalone: false,
  templateUrl: './admin-site.component.html',
})
export class AdminSiteComponent implements OnInit, OnDestroy {
  sites: Site[] = [];
  projects: Project[] = [];

  itemsPerPage = 15;
  page = 1;
  term = '';

  /**
   * Project the table is scoped to; empty means every project.
   *
   * Restarting is deliberately driven by this rather than by the rows the
   * search box happens to be showing: a stray filter must not silently change
   * which field equipment gets power-cycled.
   */
  projectFilter = '';

  /** Set while the operator confirms a project-wide restart. */
  restartAllOpen = false;

  type: 'Create' | 'Edit' = 'Create';
  siteEdited: Site | null = null;
  idEditSite = '';
  deletedSiteId = '';
  deletedSiteName = '';

  crudOpen = false;
  deleteOpen = false;

  saving = false;
  spinnerSite = false;
  midnightReloadEnabled = false;

  /** Stations with an action in flight, so each row shows its own spinner. */
  restarting = new Set<string>();
  refreshing = new Set<string>();
  /** Stations being re-checked after a restart. */
  watching = new Set<string>();

  private readonly subscriptions = new Subscription();

  constructor(
    private siteService: SiteService,
    private projectService: ProjectService,
    private message: ToastrService,
    private i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    // Stops any recovery watchers still running when the screen is left.
    this.subscriptions.unsubscribe();
  }

  /**
   * Loads everything the screen needs in parallel.
   *
   * Mutations call this rather than re-entering ngOnInit, which also re-ran the
   * modal wiring and reset unrelated view state on every save.
   */
  private load(): void {
    this.spinnerSite = true;

    forkJoin({
      projects: this.projectService.getAllProjects(),
      sites: this.siteService.getAllSites(),
      midnightReload: this.siteService.getMidnightReload(),
    }).subscribe({
      next: ({ projects, sites, midnightReload }) => {
        this.projects = projects;
        this.sites = sites;
        this.midnightReloadEnabled = Boolean(midnightReload);
        this.spinnerSite = false;
      },
      error: () => {
        this.spinnerSite = false;
        this.message.error(this.i18n.t('common.genericError'));
      },
    });
  }

  trackById(_index: number, site: Site): string {
    return site._id;
  }

  get onlineCount(): number {
    return this.sites.filter((s) => s.status).length;
  }

  onSubmit(form: NgForm): void {
    if (!form.valid) return;

    this.saving = true;
    const request =
      this.type === 'Edit'
        ? this.siteService.editSite(this.idEditSite, form.value)
        : this.siteService.addSite(form.value);

    request.subscribe({
      next: (res) => {
        this.saving = false;
        this.crudOpen = false;
        this.message.success(res.message);
        form.resetForm();
        this.load();
      },
      error: (e) => {
        this.saving = false;
        this.message.error(e?.error?.error ?? this.i18n.t('common.saveFailed'));
      },
    });
  }

  onEdit(site: Site): void {
    this.idEditSite = site._id;
    this.type = 'Edit';
    this.siteEdited = site;
    this.crudOpen = true;
  }

  openCrudModal(): void {
    this.type = 'Create';
    this.siteEdited = null;
    this.crudOpen = true;
  }

  openDeletedModal(site: Site): void {
    this.deletedSiteId = site._id;
    this.deletedSiteName = site.nom;
    this.deleteOpen = true;
  }

  remove(): void {
    if (!this.deletedSiteId) return;
    this.siteService.deleteSite(this.deletedSiteId).subscribe({
      next: (res) => {
        this.message.success(res.message);
        this.deleteOpen = false;
        this.load();
      },
      error: (e) => this.message.error(e?.error?.error ?? this.i18n.t('common.deleteFailed')),
    });
  }

  /** Restarts a single station, then watches it come back. */
  reload(site: Site): void {
    this.restarting.add(site._id);
    this.siteService.reloadSite(site._id).subscribe({
      next: (res) => {
        this.restarting.delete(site._id);
        this.message.success(res.message);
        // The station was just told to reboot, so it is going down. Show that
        // straight away rather than leaving a stale "En ligne" badge until the
        // first re-check lands; the watcher corrects it either way.
        site.status = false;
        this.watchRecovery(site);
      },
      error: (e) => {
        this.restarting.delete(site._id);
        this.message.error(
          e?.error?.error ?? this.i18n.t('adminSite.restartFailed', { name: site.nom })
        );
      },
    });
  }

  /**
   * Re-reads one station repeatedly for a short while after a restart.
   *
   * The poller sweeps every few minutes, so without this the row keeps showing
   * "En ligne" through a restart the operator can see happening on their own
   * ping — the list reflects the last sweep, not the present.
   */
  private watchRecovery(site: Site): void {
    // Clicking restart twice should not stack watchers on the same station.
    if (this.watching.has(site._id)) return;
    this.watching.add(site._id);

    const attempts = Math.ceil(RECOVERY_WATCH_MS / RECOVERY_POLL_MS);

    // exhaustMap, not switchMap: switchMap cancels the request in flight when
    // the next tick arrives, so a check slower than the interval never
    // delivered a result and the badge stayed on its last value. exhaustMap
    // lets the running check finish and ignores ticks until it does.
    const subscription = timer(0, RECOVERY_POLL_MS)
      .pipe(
        take(attempts),
        exhaustMap(() => this.siteService.pollSite(site._id).pipe(catchError(() => EMPTY)))
      )
      .subscribe({
        next: (fresh) => {
          const row = this.sites.find((s) => s._id === fresh._id);
          if (!row) return;

          // Stop once it has come back up — the restart cycle is complete.
          if (!row.status && fresh.status) {
            this.message.success(this.i18n.t('adminSite.backOnline', { name: site.nom }));
            this.watching.delete(site._id);
            subscription.unsubscribe();
          }
          row.status = fresh.status;
          row.lastSeenAt = fresh.lastSeenAt;
        },
        // The window elapsed without the station returning; leave the badge
        // showing its last observed state rather than guessing.
        complete: () => this.watching.delete(site._id),
      });

    this.subscriptions.add(subscription);
  }

  /**
   * Re-applies the station's network configuration by pressing Save on its own
   * web UI. Slower than a restart — it drives a headless browser server-side.
   */
  refresh(site: Site): void {
    this.refreshing.add(site._id);
    this.siteService.refreshSite(site._id).subscribe({
      next: (res) => {
        this.refreshing.delete(site._id);
        this.message.success(res.message);
      },
      error: (e) => {
        this.refreshing.delete(site._id);
        this.message.error(
          e?.error?.error ?? this.i18n.t('adminSite.refreshFailed', { name: site.nom })
        );
      },
    });
  }

  /**
   * Restarts every station.
   *
   * Issued directly against the service. The previous implementation reached
   * into the DOM for each row's button and synthesised a click on its icon.
   */
  /** Rows for the table, scoped to the selected project. */
  get visibleSites(): Site[] {
    if (!this.projectFilter) return this.sites;
    return this.sites.filter((site) => site.project?._id === this.projectFilter);
  }

  /**
   * Stations a project-wide restart would actually power-cycle.
   *
   * Empty until a project is chosen. Restarting every station the platform
   * knows about is not something an operator should be able to trigger with one
   * click: the fleet spans several projects, and a client is only responsible
   * for their own.
   */
  get restartTargets(): Site[] {
    if (!this.projectFilter) return [];
    return this.sites.filter((site) => site.project?._id === this.projectFilter);
  }

  get selectedProjectName(): string {
    return this.projects.find((p) => p._id === this.projectFilter)?.nom ?? '';
  }

  onProjectFilterChange(): void {
    // A narrower list can leave the current page beyond the end of it.
    this.page = 1;
  }

  askRestartAll(): void {
    if (!this.restartTargets.length) return;
    this.restartAllOpen = true;
  }

  /**
   * Restarts every station in the selected project.
   *
   * Confirmed first — this power-cycles real roadside equipment and takes each
   * station offline for about a minute. The previous version fired immediately
   * and covered every project at once.
   */
  confirmRestartAll(): void {
    const targets = this.restartTargets;
    this.restartAllOpen = false;
    if (!targets.length) return;

    this.message.info(
      this.i18n.t('adminSite.restartStarted', {
        count: targets.length,
        project: this.selectedProjectName,
      })
    );
    targets.forEach((site) => this.reload(site));
  }

  detectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.spinnerSite = true;

    this.siteService.addSiteFromFile(file).subscribe({
      next: (res) => {
        this.spinnerSite = false;
        this.message.success(res.message);
        // Per-row problems are reported instead of being swallowed.
        res.errors?.forEach((error) => this.message.warning(error));
        input.value = '';
        this.load();
      },
      error: (e) => {
        this.spinnerSite = false;
        input.value = '';
        this.message.error(e?.error?.error ?? this.i18n.t('common.importFailed'));
      },
    });
  }

  exportFile(): void {
    this.siteService.exportToExcel().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'sites.xlsx';
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.message.error(this.i18n.t('common.exportFailed')),
    });
  }

  toggleMidnightReload(enabled: boolean): void {
    this.siteService.changeMidnightReload(enabled).subscribe({
      next: (result) => {
        this.message.success(result.message);
        this.midnightReloadEnabled = enabled;
      },
      error: () => {
        this.message.error(this.i18n.t('common.genericError'));
        this.load();
      },
    });
  }
}

import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { Site } from '../../models/site';
import { Project } from '../../models/project';
import { SiteService } from '../../services/site.service';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-admin-site',
  standalone: false,
  templateUrl: './admin-site.component.html',
})
export class AdminSiteComponent implements OnInit {
  sites: Site[] = [];
  projects: Project[] = [];

  itemsPerPage = 15;
  page = 1;
  term = '';

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

  constructor(
    private siteService: SiteService,
    private projectService: ProjectService,
    private message: ToastrService
  ) {}

  ngOnInit(): void {
    this.load();
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
        this.message.error('Une erreur est survenue !');
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
        this.message.error(e?.error?.error ?? 'Enregistrement impossible');
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
      error: (e) => this.message.error(e?.error?.error ?? 'Suppression impossible'),
    });
  }

  /** Restarts a single station. */
  reload(site: Site): void {
    this.restarting.add(site._id);
    this.siteService.reloadSite(site._id).subscribe({
      next: (res) => {
        this.restarting.delete(site._id);
        this.message.success(res.message);
      },
      error: (e) => {
        this.restarting.delete(site._id);
        this.message.error(e?.error?.error ?? `Redémarrage impossible — ${site.nom}`);
      },
    });
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
        this.message.error(e?.error?.error ?? `Rafraîchissement impossible — ${site.nom}`);
      },
    });
  }

  /**
   * Restarts every station.
   *
   * Issued directly against the service. The previous implementation reached
   * into the DOM for each row's button and synthesised a click on its icon.
   */
  reloadAllSites(): void {
    if (!this.sites.length) return;
    this.message.info(`Redémarrage de ${this.sites.length} station(s)…`);
    this.sites.forEach((site) => this.reload(site));
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
        this.message.error(e?.error?.error ?? 'Import impossible');
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
      error: () => this.message.error('Export impossible'),
    });
  }

  toggleMidnightReload(enabled: boolean): void {
    this.siteService.changeMidnightReload(enabled).subscribe({
      next: (result) => {
        this.message.success(result.message);
        this.midnightReloadEnabled = enabled;
      },
      error: () => {
        this.message.error('Une erreur est survenue lors de la modification');
        this.load();
      },
    });
  }
}

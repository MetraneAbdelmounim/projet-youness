import { Directive, OnInit } from '@angular/core';
import { TranslationKey } from '../i18n/fr';
import { NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { Device } from '../models/device';
import { Project } from '../models/project';
import { DeviceService } from '../services/device.service';
import { ProjectService } from '../services/project.service';

/**
 * Shared admin screen behaviour for modems and panneaux.
 *
 * The two components were identical apart from names and French wording, so the
 * logic lives here once and each subclass supplies its service and labels.
 * Dialogs are plain booleans now rather than Flowbite instances bound to DOM
 * ids, which also removed the ngAfterViewInit wiring each screen needed.
 */
@Directive()
export abstract class AdminDeviceBase implements OnInit {
  /**
   * Wording for this resource, as translation keys rather than words.
   *
   * The shared template previously interpolated French nouns ("Modifier le " +
   * resourceLabel), which cannot be translated — word order and articles differ
   * between languages. Each screen now names a complete phrase per key.
   */
  abstract readonly titleKey: TranslationKey;
  abstract readonly emptyKey: TranslationKey;
  abstract readonly editKey: TranslationKey;
  abstract readonly addKey: TranslationKey;

  itemsPerPage = 15;
  page = 1;
  term = '';

  devices: Device[] = [];
  projects: Project[] = [];

  type: 'Create' | 'Edit' = 'Create';
  deviceEdited: Device | null = null;
  idEditDevice = '';
  deletedDeviceId = '';
  deletedDeviceName = '';

  crudOpen = false;
  deleteOpen = false;

  saving = false;
  spinnerSite = false;
  filename = '';

  protected constructor(
    protected service: DeviceService,
    protected projectService: ProjectService,
    protected message: ToastrService,
    protected exportName: string
  ) {}

  ngOnInit(): void {
    this.load();
  }

  /**
   * Loads devices and projects together.
   *
   * `ngOnInit` used to be called directly after every mutation to refresh the
   * list, which also re-ran modal setup and reset unrelated view state.
   */
  protected load(): void {
    this.spinnerSite = true;
    this.filename = '';

    forkJoin({
      projects: this.projectService.getAllProjects(),
      devices: this.service.getAll(),
    }).subscribe({
      next: ({ projects, devices }) => {
        this.projects = projects;
        this.devices = devices;
        this.spinnerSite = false;
      },
      error: () => {
        this.spinnerSite = false;
        this.message.error('Une erreur est survenue !');
      },
    });
  }

  trackById(_index: number, device: Device): string {
    return device._id;
  }

  get onlineCount(): number {
    return this.devices.filter((d) => d.status).length;
  }

  onSubmit(form: NgForm): void {
    if (!form.valid) return;

    this.saving = true;
    const request =
      this.type === 'Edit'
        ? this.service.edit(this.idEditDevice, form.value)
        : this.service.add(form.value);

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

  onEdit(device: Device): void {
    this.idEditDevice = device._id;
    this.type = 'Edit';
    this.deviceEdited = device;
    this.crudOpen = true;
  }

  openCrudModal(): void {
    this.type = 'Create';
    this.deviceEdited = null;
    this.crudOpen = true;
  }

  openDeletedModal(device: Device): void {
    this.deletedDeviceId = device._id;
    this.deletedDeviceName = device.nom;
    this.deleteOpen = true;
  }

  remove(): void {
    if (!this.deletedDeviceId) return;
    this.service.delete(this.deletedDeviceId).subscribe({
      next: (res) => {
        this.message.success(res.message);
        this.deleteOpen = false;
        this.load();
      },
      error: (e) => this.message.error(e?.error?.error ?? 'Suppression impossible'),
    });
  }

  detectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.spinnerSite = true;
    this.filename = file.name;

    this.service.addFromFile(file).subscribe({
      next: (res) => {
        this.spinnerSite = false;
        this.message.success(res.message);
        // The import reports per-row problems rather than failing silently.
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
    this.service.exportToExcel().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = this.exportName;
        link.click();
        // Release the object URL rather than leaking it for the page's lifetime.
        window.URL.revokeObjectURL(url);
      },
      error: () => this.message.error('Export impossible'),
    });
  }
}

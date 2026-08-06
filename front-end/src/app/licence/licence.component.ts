import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LicenceService, LicenceStatus } from '../services/licence.service';

/**
 * First-run and lapsed-licence screen.
 *
 * Reached whenever the platform has no valid licence. Accepts the signed
 * `.mi8lic` file by drag-and-drop or file picker; the server verifies the
 * Ed25519 signature, so an invalid or edited file is refused with a reason.
 */
@Component({
  selector: 'app-licence',
  standalone: false,
  templateUrl: './licence.component.html',
})
export class LicenceComponent implements OnInit {
  status: LicenceStatus | null = null;
  loading = true;
  uploading = false;
  dragging = false;
  fileName = '';
  errorDetail = '';
  readonly today = new Date();

  /**
   * True when reached from the admin menu rather than as a first-run gate.
   *
   * The same screen serves both: the gate must bounce away once a valid licence
   * exists, whereas the admin view is where you go *to* inspect and renew one.
   */
  managementView = false;

  /**
   * The party to contact about a renewal.
   *
   * Deliberately not the licensee: `status.customer` is the organisation the
   * licence was issued to, so telling them to contact it would be telling them
   * to contact themselves. Falls back to a neutral phrase until the server sets
   * VENDOR_NAME.
   */
  get vendorLabel(): string {
    return this.status?.vendor || 'votre fournisseur';
  }

  constructor(
    private licence: LicenceService,
    private router: Router,
    private route: ActivatedRoute,
    private message: ToastrService
  ) {}

  ngOnInit(): void {
    this.managementView = this.route.snapshot.url.some((segment) => segment.path === 'dashbord');

    this.licence.refresh().subscribe((status) => {
      this.status = status;
      this.loading = false;
      if (status.valid && !this.managementView) void this.router.navigate(['/projects']);
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging = true;
  }

  onDragLeave(): void {
    this.dragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.upload(file);
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.upload(file);
  }

  private upload(file: File): void {
    this.fileName = file.name;
    this.errorDetail = '';
    this.uploading = true;

    this.licence.install(file).subscribe({
      next: (status) => {
        this.uploading = false;
        this.status = status;
        this.message.success(`Licence activée — ${status.customer}`);
        if (!this.managementView) void this.router.navigate(['/projects']);
      },
      error: (err) => {
        this.uploading = false;
        // Show the server's reason verbatim: "signature invalide" and "licence
        // expirée" call for completely different actions from the operator.
        this.errorDetail = err?.error?.error ?? 'Le fichier de licence a été refusé';
        this.message.error(this.errorDetail);
      },
    });
  }
}

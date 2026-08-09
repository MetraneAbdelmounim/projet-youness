import { Component, OnInit } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Device } from '../models/device';
import { PanneauService } from '../services/panneau.service';

@Component({
  selector: 'app-panneaus',
  standalone: false,
  templateUrl: './panneaus.component.html',
  styleUrl: './panneaus.component.css',
})
export class PanneausComponent implements OnInit {
  panneaus: Device[] = [];
  spinnerSite = true;

  constructor(
    private panneauService: PanneauService,
    private message: ToastrService,
    private route: ActivatedRoute,
    private i18n: I18nService
  ) {}

  ngOnInit(): void {
    const projectId = this.route.snapshot.paramMap.get('id');
    if (!projectId) {
      this.spinnerSite = false;
      return;
    }

    // Reachability arrives with each panneau, so no per-row status request.
    this.panneauService.getByProject(projectId).subscribe({
      next: (panneaus) => {
        this.panneaus = panneaus;
        this.spinnerSite = false;
      },
      error: () => {
        this.spinnerSite = false;
        this.message.error(this.i18n.t('device.loadPanelsFailed'));
      },
    });
  }

  trackById(_index: number, panneau: Device): string {
    return panneau._id;
  }

  get subtitle(): string {
    if (this.spinnerSite) return this.i18n.t('common.loading');
    return this.i18n.t('device.panelSubtitle', {
      count: this.panneaus.length,
      online: this.panneaus.filter((d) => d.status).length,
    });
  }
}

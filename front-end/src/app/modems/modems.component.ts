import { Component, OnInit } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Device } from '../models/device';
import { ModemService } from '../services/modem.service';

@Component({
  selector: 'app-modems',
  standalone: false,
  templateUrl: './modems.component.html',
  styleUrl: './modems.component.css',
})
export class ModemsComponent implements OnInit {
  modems: Device[] = [];
  spinnerSite = true;

  constructor(
    private modemService: ModemService,
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

    // Reachability arrives with each modem, so no per-row status request.
    this.modemService.getByProject(projectId).subscribe({
      next: (modems) => {
        this.modems = modems;
        this.spinnerSite = false;
      },
      error: () => {
        this.spinnerSite = false;
        this.message.error(this.i18n.t('device.loadModemsFailed'));
      },
    });
  }

  trackById(_index: number, modem: Device): string {
    return modem._id;
  }

  get subtitle(): string {
    if (this.spinnerSite) return this.i18n.t('common.loading');
    return this.i18n.t('device.modemSubtitle', {
      count: this.modems.length,
      online: this.modems.filter((d) => d.status).length,
    });
  }
}

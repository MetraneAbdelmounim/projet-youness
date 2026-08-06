import { Component, OnInit } from '@angular/core';
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
    private route: ActivatedRoute
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
        this.message.error('Impossible de charger les modems');
      },
    });
  }

  trackById(_index: number, modem: Device): string {
    return modem._id;
  }

  get subtitle(): string {
    if (this.spinnerSite) return 'Chargement…';
    const online = this.modems.filter((d) => d.status).length;
    return `${this.modems.length} modem(s) · ${online} en ligne`;
  }
}

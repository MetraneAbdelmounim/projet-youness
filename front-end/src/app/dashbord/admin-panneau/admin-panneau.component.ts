import { Component } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AdminDeviceBase } from '../admin-device.base';
import { PanneauService } from '../../services/panneau.service';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-admin-panneau',
  standalone: false,
  templateUrl: '../admin-device.component.html',
})
export class AdminPanneauComponent extends AdminDeviceBase {
  readonly resourceLabel = 'panneau';
  readonly resourceLabelPlural = 'Panneaux de parcours';
  readonly sheetName = 'panneaux';

  constructor(
    panneauService: PanneauService,
    projectService: ProjectService,
    message: ToastrService
  ) {
    super(panneauService, projectService, message, 'panneaux.xlsx');
  }
}

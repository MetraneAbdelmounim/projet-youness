import { Component } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AdminDeviceBase } from '../admin-device.base';
import { ModemService } from '../../services/modem.service';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-admin-modems',
  standalone: false,
  templateUrl: '../admin-device.component.html',
})
export class AdminModemsComponent extends AdminDeviceBase {
  readonly titleKey = 'adminDevice.modemsPlural' as const;
  readonly emptyKey = 'adminDevice.emptyModem' as const;
  readonly editKey = 'adminDevice.editModem' as const;
  readonly addKey = 'adminDevice.addModem' as const;
  readonly sheetName = 'modems';

  constructor(modemService: ModemService, projectService: ProjectService, message: ToastrService) {
    super(modemService, projectService, message, 'modems.xlsx');
  }
}

import { Component, Input } from '@angular/core';
import { SiteService } from '../../services/site.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

@Component({
  selector: 'app-refresh-site',
  standalone: false,
  templateUrl: './refresh-site.component.html',
  styleUrl: './refresh-site.component.css'
})
export class RefreshSiteComponent {
@Input()
  idSite: string = ""
  spinnerReload: boolean = false

  constructor(private siteServices: SiteService,private message:ToastrService,private router:Router) { }
  refreshSite(idSite: string) {

    this.spinnerReload = true
    this.siteServices.refreshSite(idSite).subscribe((result: any) => {

      this.spinnerReload = false
      
      this.message.success(result.message)
      
    }, err => {
      this.spinnerReload = false
      this.message.error("Une erreur s’est produite pendant le redémarrage de la station")
    })
  }
}

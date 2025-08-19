import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SiteService } from '../../services/site.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

@Component({
  selector: 'app-reload-site',
  standalone: false,
  templateUrl: './reload-site.component.html',
  styleUrl: './reload-site.component.css'
})
export class ReloadSiteComponent {
  @Output() siteReloaded = new EventEmitter<boolean>();

  @Input()
  idSite: string = ""
 @Input()
  ipSite: string = ""
  spinnerReload: boolean = false

  constructor(private siteServices: SiteService,private message:ToastrService,private router:Router) { }
  reloadSite(idSite: string,ipSite:string) {

    this.spinnerReload = true
    this.siteServices.reloadSite(idSite).subscribe((result: any) => {

      this.spinnerReload = false
      
      this.message.success(result.message)
      this.siteReloaded.emit(true)
    }, err => {
      this.spinnerReload = false

      
      
      this.message.error("Une erreur s’est produite pendant le redémarrage de la station "+err.error.site)
    })
  }


}


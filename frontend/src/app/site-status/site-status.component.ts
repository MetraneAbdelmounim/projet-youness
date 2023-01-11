import {Component, Input, OnInit} from '@angular/core';
import {SiteService} from "../services/site.service";

@Component({
  selector: 'app-site-status',
  templateUrl: './site-status.component.html',
  styleUrls: ['./site-status.component.scss']
})
export class SiteStatusComponent implements OnInit {
  spinnerPing:boolean=false
  isAlive:Boolean=false
  @Input()
  ip:string=""
  constructor(private siteService:SiteService) { }

  ngOnInit(): void {
    this.spinnerPing=true
    this.siteService.getSiteStatus(this.ip).subscribe((ping:any)=>{
      this.spinnerPing=false
      this.isAlive=ping.alive

    })
  }

}

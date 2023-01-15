import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {SiteService} from "../services/site.service";
import {config} from "../../Config/config";

@Component({
  selector: 'app-site-status',
  templateUrl: './site-status.component.html',
  styleUrls: ['./site-status.component.scss']
})
export class SiteStatusComponent implements OnInit {
  dataRefresher: any;
  spinnerPing:boolean=false
  isAlive:Boolean=false
  @Input()
  ip:string=""
  constructor(private siteService:SiteService) { }

  ngOnInit(): void {
    this.spinnerPing = true
    this.dataRefresher = this.siteService.getSiteStatus(this.ip).subscribe((ping: any) => {
      this.spinnerPing = false
      this.isAlive = ping.alive

    })

  }
}

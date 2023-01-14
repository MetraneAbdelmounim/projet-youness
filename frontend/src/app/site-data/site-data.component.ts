import {Component, Input, OnInit} from '@angular/core';
import {SiteService} from "../services/site.service";
import {Site} from "../models/site";
import {config} from "../../Config/config";

@Component({
  selector: 'app-site-data',
  templateUrl: './site-data.component.html',
  styleUrls: ['./site-data.component.scss']
})
export class SiteDataComponent implements OnInit {
  spinnerData:boolean=false
  // @ts-ignore
  site:Site
  @Input()
  idSite : string=""

  constructor(private siteService:SiteService) { }

  ngOnInit(): void {

    this.spinnerData=true

    setInterval(() => {
      // @ts-ignore
      this.siteService.getDataBySiteFromMppt(this.idSite).subscribe((site:Site)=>{
        this.spinnerData=false
        this.site=site
      })
    },config.refreshDataTime)

  }

}

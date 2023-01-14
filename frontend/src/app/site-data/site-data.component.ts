import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {SiteService} from "../services/site.service";
import {Site} from "../models/site";
import {config} from "../../Config/config";

@Component({
  selector: 'app-site-data',
  templateUrl: './site-data.component.html',
  styleUrls: ['./site-data.component.scss']
})
export class SiteDataComponent implements OnInit {
  dataRefresher: any;
  spinnerData:boolean=false
  // @ts-ignore
  site:Site
  @Input()
  idSite : string=""

  constructor(private siteService:SiteService) { }

  ngOnInit(): void {

    this.spinnerData=true


      // @ts-ignore
      this.dataRefresher=this.siteService.getDataBySiteFromMppt(this.idSite).subscribe((site:Site)=>{
        this.spinnerData=false
        this.site=site
      })


  }


}

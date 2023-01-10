import {Component, OnDestroy, OnInit} from '@angular/core';
import {Site} from "../models/site";
import {SiteService} from "../services/site.service";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit,OnDestroy {
  sites: Array<Site>=new Array<Site>();
  spinnerSite: boolean=false;
  ngOnDestroy(): void {
    document.body.className=''
  }

  constructor(private siteServices:SiteService) { }

  ngOnInit(): void {
    this.spinnerSite=true
    document.body.className='body'
    // @ts-ignore
    this.siteServices.getAllSites().subscribe((sites:Array<Site>)=>{
      this.spinnerSite=false
      console.log(sites)
      this.sites=sites
    })
  }

}

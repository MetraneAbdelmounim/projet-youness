import {Component, OnDestroy, OnInit} from '@angular/core';
import {Site} from "../models/site";
import {SiteService} from "../services/site.service";
import {config} from "../../Config/config";
import {NzMessageService} from "ng-zorro-antd/message";

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

  constructor(private siteServices:SiteService,private message:NzMessageService) { }

  ngOnInit(): void {
    this.spinnerSite=true
    document.body.className='body'
    // @ts-ignore
    this.siteServices.getAllSites().subscribe((sites:Array<Site>)=>{
      this.spinnerSite=false
      this.sites=sites
    },err=>{
      this.spinnerSite=false
      this.message.error("Une erreur est survenue ! ", {nzDuration: config.durationMessage})
    })
  }

}

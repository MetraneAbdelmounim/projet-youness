import {Component, OnDestroy, OnInit} from '@angular/core';

import {Chart, ChartConfiguration, ChartItem,ChartType, registerables} from 'chart.js'

import {SiteService} from "../../services/site.service";
import{config} from "../../../Config/config"


import {Site} from "../../models/site";
import {NzMessageService} from "ng-zorro-antd/message";
import { Subject} from "rxjs";
@Component({
  selector: 'app-dashbord',
  templateUrl: './dashbord-optimized.component.html',
  styleUrls: ['./dashbord-optimized.component.scss']
})
export class DashbordOptimizedComponent implements OnInit,OnDestroy {

  sites: Array<Site>=new Array<Site>()
  idSite : Subject<string> = new Subject<string>()

  constructor(private siteServices:SiteService,private message:NzMessageService) { }

  ngOnInit(): void {
    document.body.style.paddingLeft = "15rem"
    // @ts-ignore
    this.siteServices.getAllWithoutData().subscribe((sites:Site[])=>{
      this.sites=sites
      this.sites.forEach(s=>{
        this.idSite.next(s._id)
      })
    })
    document.body.style.paddingLeft = "15rem"
  }

  ngOnDestroy(): void {
    document.body.style.paddingLeft = "0rem"
  }
}

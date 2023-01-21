import {Component, OnDestroy, OnInit} from '@angular/core';

import {Chart, ChartConfiguration, ChartItem,ChartType, registerables} from 'chart.js'

import {SiteService} from "../../services/site.service";
import{config} from "../../../Config/config"


import {Site} from "../../models/site";
import {NzMessageService} from "ng-zorro-antd/message";
import {Observable, Subject} from "rxjs";
import * as events from "events";
@Component({
  selector: 'app-dashbord',
  templateUrl: './dashbord-optimized.component.html',
  styleUrls: ['./dashbord-optimized.component.scss']
})
export class DashbordOptimizedComponent implements OnInit,OnDestroy {
  ticks =[  {
  stepSize: 2
}]
  sites: Array<Site>=new Array<Site>()
  idSite : Subject<string> = new Subject<string>()
  dataSite : Subject<any[]> = new Subject<any[]>()
  dataColor : Subject<any[]> = new Subject<any[]>()
  data: any[]=[]
  color  : any[]=[]
  spinnerSite: boolean = false;

  constructor(private siteServices:SiteService,private message:NzMessageService) { }

  ngOnInit(): void {
    document.body.style.paddingLeft = "15rem"
    this.spinnerSite=true
    // @ts-ignore
    this.siteServices.getAllSites().subscribe((sites:Site[])=>{
      this.sites=sites
      sites.forEach(s=>{
        this.data.push({name:s.nom,value:s.Battery_Voltage})
        this.color.push({name:s.nom,value:this.getColor(s.Battery_Voltage)})
      })
      this.spinnerSite=false

      this.dataSite.next([...this.data])
      this.dataColor.next([...this.color])

    })
    document.body.style.paddingLeft = "15rem"
  }

  getColor(Battery_Voltage: Number) {
    if(Battery_Voltage>config.Battery_Max) return "#61e18a"
    else return "#ffa265"
  }

  ngOnDestroy(): void {
    document.body.style.paddingLeft = "0rem"
  }

  onRefresh() {
    // @ts-ignore
    this.dataColor.next(null)
    // @ts-ignore
    this.dataSite.next(null)
    this.ngOnInit()
  }

}

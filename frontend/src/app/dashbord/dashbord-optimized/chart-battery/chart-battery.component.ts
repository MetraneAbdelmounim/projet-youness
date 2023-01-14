import {Component, Input, OnInit} from '@angular/core';
import {Observable, Subject} from "rxjs";
import {SiteService} from "../../../services/site.service";
import {Site} from "../../../models/site";

@Component({
  selector: 'app-chart-battery',
  templateUrl: './chart-battery.component.html',
  styleUrls: ['./chart-battery.component.scss']
})
export class ChartBatteryComponent implements OnInit {
   data = {name:"hello",value:15}
  saleData : any[] = [];
  @Input()
  idSite : Subject<string>= new Subject<string>()
  dataSite : Subject<any> = new Subject<Site>()


  constructor(private siteService:SiteService) { }

  ngOnInit(): void {
    this.idSite.subscribe(id=>{
      // @ts-ignore
      this.siteService.getDataBySiteFromMppt(id).subscribe((site:Site)=>{
        this.saleData.push(this.data)
      })
    })

  }

  getData(dataSite: Subject<any>) {
    this.dataSite.subscribe(s=>{
      console.log(s)
    })
  }
}

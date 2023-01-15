import {ChangeDetectorRef, Component, Input, NgZone, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {Observable, Subject, timer} from "rxjs";
import {map, startWith} from 'rxjs/operators';
import {SiteService} from "../../../services/site.service";
import {Site} from "../../../models/site";

@Component({
  selector: 'app-chart-battery',
  templateUrl: './chart-battery.component.html',
  styleUrls: ['./chart-battery.component.scss']
})
export class ChartBatteryComponent implements OnInit {


  @Input()
  idSite: Subject<string> = new Subject<string>()


  constructor(private siteService: SiteService) {
  }


  ngOnInit(): void {
    this.idSite.subscribe(id=>{
      this.siteService.getDataBySiteFromMppt(id).subscribe()
    })

  }
}

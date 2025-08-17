import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { SiteService } from '../services/site.service';

@Component({
  selector: 'app-site-data',
  standalone: false,
  templateUrl: './site-data.component.html',
  styleUrl: './site-data.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SiteDataComponent implements OnInit {

  // @ts-ignore
  site:Site

  @Input()
  idSite! : string

  constructor(private siteService:SiteService,private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    //@ts-ignore

    this.siteService.getDataBySiteFromMppt(this.idSite).subscribe((site:Site)=>{
      this.site=site
      this.cdr.detectChanges();
    })
  }

}
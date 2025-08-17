import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { SiteService } from '../services/site.service';
import { Analysis } from '../models/analysis';

@Component({
  selector: 'app-site-status',
  standalone: false,
  templateUrl: './site-status.component.html',
  styleUrl: './site-status.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SiteStatusComponent implements OnInit{
  spinnerPing:boolean=false
  isAlive:Boolean=false
  performance:String=""
  @Input()
  idSite:string=""
  @Input()
  ip:string=""
  constructor(private siteService:SiteService,private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.spinnerPing=true
    this.siteService.getSiteStatus(this.ip).subscribe((ping:any)=>{
      this.spinnerPing=false
      this.isAlive=ping.alive
      this.cdr.detectChanges();
    })

    
    
  }

}

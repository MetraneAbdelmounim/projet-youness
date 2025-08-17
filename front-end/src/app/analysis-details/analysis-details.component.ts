import { Component, OnInit } from '@angular/core';
import { SiteService } from '../services/site.service';
import { Analysis } from '../models/analysis';
import { ActivatedRoute } from '@angular/router';
import { Site } from '../models/site';


@Component({
  selector: 'app-analysis-details',
  standalone: false,
  templateUrl: './analysis-details.component.html',
  styleUrl: './analysis-details.component.css'
})
export class AnalysisDetailsComponent implements OnInit {
   
//@ts-ignore
  analysis : Analysis
  //@ts-ignore
  site:Site 
  
  constructor(private siteService:SiteService,private route:ActivatedRoute){}

  ngOnInit(): void {
    const siteId = this.route.snapshot.paramMap.get('idSite');
   
    if(siteId){
      
        this.siteService.getDataAnalysisBySiteFromMPPT(siteId).subscribe((data:any)=>{
          
          this.analysis=data
        })
        this.siteService.getSiteByIDWithoutData(siteId).subscribe((site:any)=>{
          
          this.site=site
        })
    }
    
  }
  

}

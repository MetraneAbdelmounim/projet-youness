import { Component, OnInit } from '@angular/core';
import { Site } from '../models/site';
import { SiteService } from '../services/site.service';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})

export class HomeComponent implements OnInit{
  

  constructor(private siteServices:SiteService,private message:ToastrService,private route:ActivatedRoute) { }
  sites: Array<Site>=new Array<Site>();
  spinnerSite: boolean=false;
  ngOnInit(): void {
    const projectId = this.route.snapshot.paramMap.get('id');
     // @ts-ignore
    this.siteServices.getAllSitesByProjectWIthoutData(projectId).subscribe((sites:Array<Site>)=>{
    
    
      
      this.spinnerSite=false
      this.sites=sites
    },err=>{
      this.spinnerSite=false
      
      console.log(err);
      
      this.message.error(err.error.error)
    })
  }

}

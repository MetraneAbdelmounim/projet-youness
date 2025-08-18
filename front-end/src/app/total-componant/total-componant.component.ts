import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { SiteService } from '../services/site.service';
import { Site } from '../models/site';
import { ModemService } from '../services/modem.service';
import { Modem } from '../models/modem';
import { PanneauService } from '../services/panneau.service';
import { Panneau } from '../models/panneau';

@Component({
  selector: 'app-total-componant',
  standalone: false,
  templateUrl: './total-componant.component.html',
  styleUrl: './total-componant.component.css',

})
export class TotalComponantComponent implements OnInit {

  @Input()
  type:string=""
@Input()
  idProject!:string 
  total : number=0
  constructor(private siteService:SiteService,private modemService:ModemService,private panneauService: PanneauService ){}
  ngOnInit(): void {

    if(this.type === "MPPT"){
      // @ts-ignore
      this.siteService.getAllSitesByProjectWIthoutData(this.idProject).subscribe((sites : Array<Site>)=>{
  
        
        this.total=sites?.length
 
        
      })

    }
    else if (this.type==='MODEM'){
      // @ts-ignore
      this.modemService.getModemsByProject(this.idProject).subscribe((modems:Array<Modem>)=>{
        this.total=modems.length
      })

    }
    else{
       // @ts-ignore
       this.panneauService.getPanneausByProject(this.idProject).subscribe((panneaus:Array<Panneau>)=>{
        this.total=panneaus.length
      })
    }
  }



}

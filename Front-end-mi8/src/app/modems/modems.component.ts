import { Component, OnInit } from '@angular/core';

import { ToastrService } from 'ngx-toastr';
import { ModemService } from '../services/modem.service';
import { Modem } from '../models/modem';
import { ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-modems',
  standalone: false,
  templateUrl: './modems.component.html',
  styleUrl: './modems.component.css'
})
export class ModemsComponent implements OnInit{
  

  constructor(private modemServices:ModemService,private message:ToastrService,private route:ActivatedRoute) { }
 modems: Array<Modem>=new Array<Modem>();
  spinnerSite: boolean=false;
  ngOnInit(): void {

    const projectId = this.route.snapshot.paramMap.get('id');
     // @ts-ignore
    this.modemServices.getModemsByProject(projectId).subscribe((modems:Array<Modem>)=>{
    
   
      
      this.spinnerSite=false
      this.modems=modems
    },err=>{
      this.spinnerSite=false
      
      console.log(err);
      
      this.message.error(err.error.error)
    })
  }

}

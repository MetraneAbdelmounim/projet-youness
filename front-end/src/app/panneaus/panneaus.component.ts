import { Component, OnInit } from '@angular/core';

import { ToastrService } from 'ngx-toastr';
import { PanneauService } from '../services/panneau.service';
import { Panneau } from '../models/panneau';
import { ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-panneaus',
  standalone: false,
  templateUrl: './panneaus.component.html',
  styleUrl: './panneaus.component.css'
})
export class PanneausComponent implements OnInit{
  

  constructor(private panneauServices:PanneauService,private message:ToastrService,private route:ActivatedRoute) { }
 panneaus: Array<Panneau>=new Array<Panneau>();
  spinnerSite: boolean=false;
  ngOnInit(): void {

    const projectId = this.route.snapshot.paramMap.get('id');
     // @ts-ignore
    this.panneauServices.getPanneausByProject(projectId).subscribe((panneaus:Array<Panneau>)=>{
    
   
      
      this.spinnerSite=false
      this.panneaus=panneaus
    },err=>{
      this.spinnerSite=false
      
      
      
   this.message.error(err.error.error)
    })
  }

}

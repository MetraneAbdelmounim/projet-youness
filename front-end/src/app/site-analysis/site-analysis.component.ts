import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { SiteService } from '../services/site.service';
import { Analysis } from '../models/analysis';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-site-analysis',
  standalone: false,
  templateUrl: './site-analysis.component.html',
  styleUrl: './site-analysis.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SiteAnalysisComponent {

  // @ts-ignore
  siteAnalysis:any

  @Input()
  idSite! : string
   
  constructor(private siteService:SiteService,private cdr: ChangeDetectorRef,private route:ActivatedRoute) { }
  @Output() analysisReady = new EventEmitter<any>();
  ngOnInit(): void {
     
    this.siteService.getDataAnalysisBySiteFromMPPT(this.idSite).subscribe({
    next: (res) => {

      
      this.siteAnalysis=res
      this.cdr.detectChanges()
      this.analysisReady.emit(res);  // ✅ envoyer au parent
    },
    error: (err) => {
      
      this.analysisReady.emit(null);  // Ou émettre un placeholder
    }
  });
    
  }
}

import { ChangeDetectionStrategy, Component, ElementRef, ViewChild } from '@angular/core';
import { SiteService } from '../services/site.service';
import { ToastrService } from 'ngx-toastr';
import { Site } from '../models/site';
import { ActivatedRoute, Router } from '@angular/router';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProjectService } from '../services/project.service';
import { Project } from '../models/project';
@Component({
  selector: 'app-analysis',
  standalone: false,
  templateUrl: './analysis.component.html',
  styleUrl: './analysis.component.css',

})
export class AnalysisComponent {

  constructor(private siteServices:SiteService,private message:ToastrService,private router:Router,private route:ActivatedRoute,private projectService:ProjectService) { }
  analysisMap: { [key: string]: any } = {};
   // @ts-ignore
  project : Project=null
  sites: Array<Site>=new Array<Site>();
  spinnerSite: boolean=false;
  ngOnInit(): void {
    this.spinnerSite=true
    const projectId = this.route.snapshot.paramMap.get('id');
    // @ts-ignore
    this.projectService.getprojectByID(projectId).subscribe((project:Project)=>{
      this.spinnerSite=false
      this.project=project
    },err=>{
      this.spinnerSite=false
      this.message.error("Une erreur est survenue ! ")
    })
     // @ts-ignore
    this.siteServices.getAllSitesByProjectWIthoutData(projectId).subscribe((sites:Array<Site>)=>{
      this.spinnerSite=false
      this.sites=sites
    },err=>{
      this.spinnerSite=false
      this.message.error("Une erreur est survenue ! ")
    })
  }
  generatePDF(nomProjet:string) {
  const doc = new jsPDF();

  const logoBase64 = 'assets/images/logo.png'; // Remplace par ton vrai logo

  // 🖼️ Ajout du logo
  doc.addImage(logoBase64, 'PNG', 10, 10, 30, 20); // x, y, width, height

  // 🏷️ Titre
  doc.setFontSize(16);
  doc.setTextColor(40);
  doc.text(`Projet : ${nomProjet} \n`, 50, 10); // x, y (centrer manuellement si besoin)
  doc.text(`Rapport d'analyse des stations MPPT/Météo`, 50, 20); // x, y (centrer manuellement si besoin)

  // 🕗 Date
  doc.setFontSize(10);
  doc.text("Généré le : " + new Date().toLocaleString(), 50, 27);

  // Décalage vertical (éviter que la table se superpose au logo/titre)
  const startY = 35;

  // 🔢 Préparer les données
  const tableData = this.sites.map(site => {
    const analysis = this.analysisMap[site._id];

    return [
      site.nom,
      site.ip,
      analysis?.avg_remaining_cloud ?? 'N/A',
      analysis?.remaining_sun_hours ?? 'N/A',
      analysis?.battery_type ?? 'N/A',
      analysis?.battery_capacity_loss ?? 'N/A',
      analysis?.solar_charge_loss_clouds ?? 'N/A',
      analysis?.solar_charge_efficiency ?? 'N/A',
      analysis?.current_battery_voltage ?? 'N/A',
      analysis?.performance ?? 'N/A'
    ];
  });

  // 📊 Génération du tableau
 autoTable(doc, {
  head: [[
    'Nom', 'IP', 'Cloud (%)', 'Sun Hours', 'Type Batterie',
    'Perte Batt.', 'Perte Nuages', 'Efficacité',
    'Voltage', 'Performance'
  ]],
  body: tableData,
  styles: { fontSize: 8 },
  headStyles: { fillColor: [41, 128, 185] },
  margin: { top: startY },

  // 🎨 Customize performance cell color
 didParseCell: function (data) {
  const colIndex = data.column.index;

  if (data.section === 'body' && colIndex === 9) {
    // ✅ Safely access the raw row as a string array
    const row = data.row.raw as string[];
    const performance = row[9];

    if (performance === 'UP') {
      data.cell.styles.textColor = [0, 128, 0]; // Green
    } else if (performance === 'DOWN') {
      data.cell.styles.textColor = [220, 20, 60]; // Red
    } else if (performance === 'MEDIUM') {
      data.cell.styles.textColor = [30, 144, 255]; // Blue
    }
  }
}
});

  // 💾 Télécharger
  doc.save(`[${nomProjet}]Rapport_sites.pdf`);
}

onAnalysisReceived(siteId: string, analysis: any) {

  this.analysisMap[siteId] = analysis;
}
allAnalysesReady(): boolean {
  return this.sites.every(site => this.analysisMap[site._id]);
}
analysisDetail(id:string,idProject:string){
    console.log(id,idProject);
    
    this.router.navigate([`/project/${idProject}/analysis`,id])
    .then(() => {
      window.location.reload();
    });
  }
}

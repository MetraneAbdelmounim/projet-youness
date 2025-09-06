import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChildren, viewChildren } from '@angular/core';
import { config } from '../../../Config/config';
import { SiteService } from '../../services/site.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NgForm } from '@angular/forms';
import { Site } from '../../models/site';
import { ToastrService } from 'ngx-toastr';
import { Modal } from 'flowbite';
import { ProjectService } from '../../services/project.service';
import { ReloadSiteComponent } from '../reload-site/reload-site.component';


@Component({
  selector: 'app-admin-site',
  standalone: false,
  templateUrl: './admin-site.component.html',
  styleUrl: './admin-site.component.css'
})
export class AdminSiteComponent  implements OnInit,AfterViewInit {


   // @ts-ignore
    projects: Array<Project>=new Array<Project>()
selectedSites: any[] = [];
  itemsPerPage: number = 20;
  page:number=1;
  // @ts-ignore
  type: string = "Create"

  // @ts-ignore
  sites: Array<Site>=new Array<Site>()
  // @ts-ignore
  saving: boolean = false;
  // @ts-ignore
  editSite: Site;
  hiddenModal: boolean = true;
  // @ts-ignore
  siteEdited: Site = null;
  // @ts-ignore
  idEditSite: string
  // @ts-ignore
  selectedFile: File=null;

  filename ='Importer un fichier';
  // @ts-ignore
  fileUploaded: boolean;
  midnightReloadEnabled:boolean=false
  uploaded: boolean = false;
  term: string = "";
  spinnerSite: boolean=false;
  deletedSiteId: string = "";
  deletedModal: Modal | null = null;
  crudModal : Modal | null = null;
  spinnerReload : boolean=false
  idSiteReloaded :  String=""

  ngAfterViewInit(): void {
    const modalDEl = document.getElementById('delete-modal');
    const modalCrud = document.getElementById('crud-modal');
    if (modalDEl) {
      this.deletedModal = new Modal(modalDEl);

    }
    if (modalCrud) {
      this.crudModal = new Modal(modalCrud);

    }
  }

  constructor(private siteServices:SiteService,private message:ToastrService,private projectService:ProjectService) { }

  ngOnInit(): void {
     
    this.filename ='Importer un fichier';
    // @ts-ignore
    this.selectedFile=null
    this.uploaded=false
    this.spinnerSite=true
    
     this.siteServices.getMidnightReload().subscribe(result=>{

      
      
     this.midnightReloadEnabled=Boolean(result)
      
    })

    // @ts-ignore
    this.projectService.getAllProjects().subscribe((projects:Array<Project>)=>{
          this.spinnerSite=false
          this.projects=projects
      
          
        },err=>{
          this.spinnerSite=false
          this.message.error("Une erreur est survenue ! ")
        })

     // @ts-ignore
    this.siteServices.getAllWithoutData().subscribe((sites:Array<Site>)=>{
      this.spinnerSite=false
      this.sites=sites
    },err=>{
      this.spinnerSite=false
      this.message.error("Une erreur est survenue ! ")
    })
  }

  onAddStock(f: NgForm, site: Site,sites:Array<Site>) {

    if (f.valid) {


      if (this.type !== "Edit") {
        this.saving = true 
        
        this.siteServices.addSite(f.value).subscribe((res: any) => {
          this.saving = false
          this.message.success(res.message)
          this.crudModal?.hide()
          this.ngOnInit()
          f.resetForm()
          
        }, e => {
          this.saving = false
          this.crudModal?.hide()
          this.message.error(e.error )
        })
      } else {
        this.saving = true
        this.siteServices.editSite(this.idEditSite, f.value).subscribe((res: any) => {
          this.saving = false
          this.message.success(res.message)
          this.crudModal?.hide()
          this.ngOnInit()
          
        }, e => {
          this.saving = false
          this.crudModal?.hide()
          this.message.error(e.error,)
        })
      }

    }
  }
  onFitchSite(site:Site) {
    this.idEditSite = site?._id
    this.type = "Edit"
    this.siteEdited = site
    this.crudModal?.show()

  }


  openAddModal() {
    this.ngOnInit()
    // @ts-ignore
    this.editStock = null
    this.type = 'Create'
    this.hiddenModal = false
  }

  onCloseAddModal() {
    this.hiddenModal = true
  }

  ShowModale(_id: string, nom: string) {
    /*if (_id) {
      this.modal.confirm({
        nzTitle: 'Vous êtes sûr de supprimer ce site ?',
        nzContent: "' " + nom + " '",
        nzOkText: 'Yes',
        nzOkType: 'primary',
        nzOkDanger: true,
        nzOnOk: () => this.deleteSite(_id),
        nzCancelText: 'No',
      });
    }*/
  }

  deleteSite(_id: string) {
    if (_id) {
      this.siteServices.deleteSite(_id).subscribe((res: any) => {
        this.message.success(res.message)
        this.ngOnInit()
      }, e => {
        this.message.error(e.error)
      })
    }
    ;
    
  }

  openDeletedModal(arg0: string) {
    this.deletedSiteId=arg0
    this.deletedModal?.show()
  }
  openCrudModal() {
    this.type="Create"
    this.crudModal?.show()
  }

  detectFile(event: any) {
    this.spinnerSite=true
    this.selectedFile = event.target.files[0] ;
    if (event.target.files && event.target.files.length > 0) {
      this.onUploadFile(event.target.files[0]);
      this.siteServices.addSiteFromFile(this.selectedFile).subscribe((res: any) => {
        this.spinnerSite=false
        this.uploaded=false
        this.message.success(res.message)
        this.ngOnInit()
      }, e => {
        this.spinnerSite=false
        this.uploaded=false
        this.message.error(e.error)
      })
      this.filename = this.selectedFile.name;
    }
  }
  private onUploadFile(file: File) {

    this.fileUploaded=true;
  }
  onStartUpload() {
    this.uploaded = true
  }

  exportFile(){
    this.siteServices.exportToExcel().subscribe((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sites.xlsx';
      a.click();
    },err=>{
      console.log(err);
      
    });
  }
  
onSiteReloaded(siteId: string, reloaded: any) {

  this.ngOnInit()
}
@ViewChildren('reloadBtn', { read: ElementRef }) reloadButtons!: QueryList<ElementRef>;

    reloadAllSites() {
     this.reloadButtons.forEach((cmp, i) => {
    const icon: HTMLElement | null = cmp.nativeElement.querySelector('i');
    if (icon) {
     
      icon.click();
    } else {
      
    }
  });
  }

toggleMidnightReload(arg0: boolean) {

  
  const value = {reload_midgniht:arg0}
 this.siteServices.changeMidnightReload(value).subscribe((result:any)=>{
    this.message.success(result.message)
    this.ngOnInit()
  },err=>{
    this.message.error("Une erreur est survenue lors du modification")
    this.ngOnInit()
  })
}

}

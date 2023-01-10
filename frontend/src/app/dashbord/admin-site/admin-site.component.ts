import {Component, OnDestroy, OnInit} from '@angular/core';
import {Site} from "../../models/site";
import {SiteService} from "../../services/site.service";
import {NzMessageService} from "ng-zorro-antd/message";
import {NgForm} from "@angular/forms";
import {config} from "../../../Config/config";
import {NzModalService} from "ng-zorro-antd/modal";

@Component({
  selector: 'app-admin-site',
  templateUrl: './admin-site.component.html',
  styleUrls: ['./admin-site.component.scss']
})
export class AdminSiteComponent implements OnInit,OnDestroy {
  itemsPerPage: number = 20;
  page:number=1;
  // @ts-ignore
  type: string = "Create"

  // @ts-ignore
  sites: Array<Site>=new Array<Site>()
  // @ts-ignore
  saving: boolean = false;
  // @ts-ignore
  type: string;
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
  uploaded: boolean = false;
  term: string = "";
  spinnerSite: boolean=false;
  constructor(private siteServices:SiteService,private message:NzMessageService,private modal:NzModalService) { }

  ngOnDestroy(): void {
    document.body.style.paddingLeft = "0rem"
    }

  ngOnInit(): void {
    this.filename ='Importer un fichier';
    // @ts-ignore
    this.selectedFile=null
    this.uploaded=false
    document.body.style.paddingLeft = "15rem"
    this.spinnerSite=true
    // @ts-ignore

    this.siteServices.getAllSites().subscribe((sites:Array<Site>)=>{
      console.log(sites)
      this.spinnerSite=false
      this.sites=sites

    })
  }

  onAddStock(f: NgForm, site: Site) {

    if (f.valid) {


      if (this.type !== "Edit") {
        this.saving = true
        this.siteServices.addSite(f.value).subscribe((res: any) => {
          this.saving = false
          this.message.success(res.message, {nzDuration: config.durationMessage})
          this.ngOnInit()
          f.resetForm()
          this.hiddenModal = true
        }, e => {
          this.saving = false
          this.message.error(e.error, {nzDuration: config.durationMessage})
        })
      } else {
        this.saving = true
        this.siteServices.editSite(this.idEditSite, f.value).subscribe((res: any) => {
          this.saving = false
          this.message.success(res.message, {nzDuration: config.durationMessage})
          this.ngOnInit()
          this.hiddenModal = true
        }, e => {
          this.saving = false
          this.message.error(e.error, {nzDuration: config.durationMessage})
        })
      }

    }
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
    if (_id) {
      this.modal.confirm({
        nzTitle: 'Vous êtes sûr de supprimer ce site ?',
        nzContent: "' " + nom + " '",
        nzOkText: 'Yes',
        nzOkType: 'primary',
        nzOkDanger: true,
        nzOnOk: () => this.deleteSite(_id),
        nzCancelText: 'No',
      });
    }
  }

  deleteSite(_id: string) {
    if (_id) {
      this.siteServices.deleteSite(_id).subscribe((res: any) => {
        this.message.success(res.message, {nzDuration: config.durationMessage})
        this.ngOnInit()
      }, e => {
        this.message.error(e.error, {nzDuration: config.durationMessage})
      })
    }
    ;
  }

  onFitchSite(site:Site) {
    this.idEditSite = site?._id
    this.type = "Edit"
    this.siteEdited = site
    this.hiddenModal = false

  }
  detectFile(event: any) {

    this.selectedFile = event.target.files[0] ;
    if (event.target.files && event.target.files.length > 0) {
      this.onUploadFile(event.target.files[0]);
      this.siteServices.addSiteFromFile(this.selectedFile).subscribe((res: any) => {
        this.uploaded=false
        this.message.success(res.message, {nzDuration: config.durationMessage})
        this.ngOnInit()
      }, e => {
        this.uploaded=false
        this.message.error(e.error, {nzDuration: config.durationMessage})
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
}

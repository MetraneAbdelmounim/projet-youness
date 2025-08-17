import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';

import { NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Modal } from 'flowbite';
import { ModemService } from '../../services/modem.service';
import { Modem } from '../../models/modem';
import { ProjectService } from '../../services/project.service';


@Component({
  selector: 'app-admin-modems',
  standalone: false,
  templateUrl: './admin-modems.component.html',
  styleUrl: './admin-modems.component.css'
})
export class AdminModemsComponent   implements OnInit,AfterViewInit {

  itemsPerPage: number = 20;
  page:number=1;
  // @ts-ignore
  type: string = "Create"

  // @ts-ignore
  modems: Array<Modem>=new Array<Modem>()
  // @ts-ignore
  saving: boolean = false;
  // @ts-ignore
  editModem: Modem;
  hiddenModal: boolean = true;
  // @ts-ignore
  modemEdited: Modem = null;
  // @ts-ignore
  idEditModem: string
  // @ts-ignore
  selectedFile: File=null;

  filename ='Importer un fichier';
  // @ts-ignore
  fileUploaded: boolean;
  uploaded: boolean = false;
  term: string = "";
  spinnerSite: boolean=false;
  deletedModemId: string = "";
  deletedModal: Modal | null = null;
  crudModal : Modal | null = null;
  // @ts-ignore
    projects: Array<Project>=new Array<Project>()
  ngAfterViewInit(): void {
    const modalDEl = document.getElementById('delete-modal-modem');
    const modalCrud = document.getElementById('crud-modal-modem');
    if (modalDEl) {
      this.deletedModal = new Modal(modalDEl);

    }
    if (modalCrud) {
      this.crudModal = new Modal(modalCrud);

    }
  }

  constructor(private modemService:ModemService,private message:ToastrService,private projectService:ProjectService) { }

  ngOnInit(): void {
    this.filename ='Importer un fichier';
    // @ts-ignore
    this.selectedFile=null
    this.uploaded=false
    this.spinnerSite=true
    this.onCloseAddModal()
     // @ts-ignore
    this.projectService.getAllProjects().subscribe((projects:Array<Project>)=>{
          this.spinnerSite=false
          this.projects=projects
            // @ts-ignore
        },err=>{
          this.spinnerSite=false
          this.message.error("Une erreur est survenue ! ")
        })

    // @ts-ignore

    this.modemService.getAllModems().subscribe((modems:Array<Modem>)=>{
      this.spinnerSite=false
      this.modems = modems
        // @ts-ignore
    },err=>{
      this.spinnerSite=false
      this.message.error("Une erreur est survenue ! ")
    })
  }

  onAddStock(f: NgForm, modem: Modem) {

    if (f.valid) {


      if (this.type !== "Edit") {
        this.saving = true
        this.modemService.addModem(f.value).subscribe((res: any) => {
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
        this.modemService.editModem(this.idEditModem, f.value).subscribe((res: any) => {
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
  onFitchSite(modem:Modem) {
    this.idEditModem = modem?._id
    this.type = "Edit"
    this.modemEdited = modem
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
      this.modemService.deleteModem(_id).subscribe((res: any) => {
        this.message.success(res.message)
        this.onCloseAddModal()
        this.ngOnInit()
      }, e => {
        this.message.error(e.error)
      })
    }
    ;
    
  }

  openDeletedModal(arg0: string) {
    this.deletedModemId=arg0
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
      this.modemService.addModemFromFile(this.selectedFile).subscribe((res: any) => {
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
    this.modemService.exportToExcel().subscribe((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'modems.xlsx';
      a.click();
    },err=>{
      console.log(err);
      
    });
  }

}

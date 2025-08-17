import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';

import { NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Modal } from 'flowbite';
import { PanneauService } from '../../services/panneau.service';
import { Panneau } from '../../models/panneau';
import { ProjectService } from '../../services/project.service';


@Component({
  selector: 'app-admin-panneau',
  standalone: false,
  templateUrl: './admin-panneau.component.html',
  styleUrl: './admin-panneau.component.css'
})
export class AdminPanneauComponent   implements OnInit,AfterViewInit {

  itemsPerPage: number = 20;
  page:number=1;
  // @ts-ignore
  type: string = "Create"

  // @ts-ignore
  panneaus: Array<Panneau>=new Array<Panneau>()
  // @ts-ignore
  saving: boolean = false;
  // @ts-ignore
  editPanneau: Panneau;
  hiddenModal: boolean = true;
  // @ts-ignore
  panneauEdited: Panneau = null;
  // @ts-ignore
  idEditPanneau: string
  // @ts-ignore
  selectedFile: File=null;

  filename ='Importer un fichier';
  // @ts-ignore
  fileUploaded: boolean;
  uploaded: boolean = false;
  term: string = "";
  spinnerSite: boolean=false;
  deletedPanneauId: string = "";
  deletedModal: Modal | null = null;
  crudModal : Modal | null = null;
  // @ts-ignore
    projects: Array<Project>=new Array<Project>()
  ngAfterViewInit(): void {
    const modalDEl = document.getElementById('delete-modal-panneau');
    const modalCrud = document.getElementById('crud-modal-panneau');
    if (modalDEl) {
      this.deletedModal = new Modal(modalDEl);

    }
    if (modalCrud) {
      this.crudModal = new Modal(modalCrud);

    }
  }

  constructor(private panneauService:PanneauService,private message:ToastrService,private projectService:ProjectService) { }

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

    this.panneauService.getAllPanneaus().subscribe((panneaus:Array<Panneau>)=>{
      this.spinnerSite=false
      this.panneaus = panneaus
        // @ts-ignore
    },err=>{
      this.spinnerSite=false
      this.message.error("Une erreur est survenue ! ")
    })
  }

  onAddStock(f: NgForm, panneau: Panneau) {

    if (f.valid) {


      if (this.type !== "Edit") {
        this.saving = true
        this.panneauService.addPanneau(f.value).subscribe((res: any) => {
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
        this.panneauService.editPanneau(this.idEditPanneau, f.value).subscribe((res: any) => {
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
  onFitchSite(panneau:Panneau) {
    this.idEditPanneau = panneau?._id
    this.type = "Edit"
    this.panneauEdited = panneau
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
      this.panneauService.deletePanneau(_id).subscribe((res: any) => {
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
    this.deletedPanneauId=arg0
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
      this.panneauService.addPanneauFromFile(this.selectedFile).subscribe((res: any) => {
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
    this.panneauService.exportToExcel().subscribe((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'panneaus.xlsx';
      a.click();
    },err=>{
      console.log(err);
      
    });
  }

}

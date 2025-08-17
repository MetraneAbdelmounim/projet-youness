import { Component } from '@angular/core';
import { Project } from '../../models/project';
import { Modal } from 'flowbite';
import { ProjectService } from '../../services/project.service';
import { ToastrService } from 'ngx-toastr';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-admin-project',
  standalone: false,
  templateUrl: './admin-project.component.html',
  styleUrl: './admin-project.component.css'
})
export class AdminProjectComponent {
 itemsPerPage: number = 20;
  page:number=1;
  // @ts-ignore
  type: string = "Create"

  // @ts-ignore
  projects: Array<Project>=new Array<Project>()
  // @ts-ignore
  saving: boolean = false;
  // @ts-ignore
  editProject: Project;
  hiddenModal: boolean = true;
  // @ts-ignore
  projectEdited: Project = null;
  // @ts-ignore
  idEditProject: string
  // @ts-ignore
  selectedFile: File=null;

  filename ='Importer un fichier';
  // @ts-ignore
  fileUploaded: boolean;
  uploaded: boolean = false;
  term: string = "";
  spinnerSite: boolean=false;
  deletedProjectId: string = "";
  deletedModal: Modal | null = null;
  crudModal : Modal | null = null;

  ngAfterViewInit(): void {
    const modalDEl = document.getElementById('delete-modal-project');
    const modalCrud = document.getElementById('crud-modal-project');
    if (modalDEl) {
      this.deletedModal = new Modal(modalDEl);

    }
    if (modalCrud) {
      this.crudModal = new Modal(modalCrud);

    }
  }

  constructor(private projectService:ProjectService,private message:ToastrService) { }

  ngOnInit(): void {
   
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
  }

  onAddStock(f: NgForm, project: Project) {

    if (f.valid) {


      if (this.type !== "Edit") {
        this.saving = true
        this.projectService.addProject(f.value).subscribe((res: any) => {
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
        this.projectService.editProject(this.idEditProject, f.value).subscribe((res: any) => {
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
  onFitchSite(project:Project) {
    this.idEditProject = project?._id
    this.type = "Edit"
    this.projectEdited = project
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

  deleteProject(_id: string) {
    if (_id) {
      this.projectService.deleteProject(_id).subscribe((res: any) => {
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
    this.deletedProjectId=arg0
    this.deletedModal?.show()
  }
  openCrudModal() {
    this.type="Create"
    this.crudModal?.show()
  }

  
  private onUploadFile(file: File) {

    this.fileUploaded=true;
  }
  onStartUpload() {
    this.uploaded = true
  }


}

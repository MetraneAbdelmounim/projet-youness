import { AfterViewInit, Component, OnInit } from '@angular/core';
import { initFlowbite } from 'flowbite';
import { config } from "../../../Config/config";
import { Member } from '../../models/member';
import { MemberService } from '../../services/member.service';
import { error } from '@ant-design/icons-angular';
import { NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Modal } from 'flowbite';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project';
@Component({
  selector: 'app-admin-member',
  standalone: false,
  templateUrl: './admin-member.component.html',
  styleUrl: './admin-member.component.css'
})
export class AdminMemberComponent implements OnInit, AfterViewInit {
  listOfOption: Array<{ value: string; label: string }> = [];
  listOfSelectedValue : String[] =[];
   listOfSelectedProjects : String[] =[];
  itemsPerPage: number = 20;
  page: number = 1;
  // @ts-ignore
  type: string = "Create"

  // @ts-ignore
  members: Array<Member> = new Array<Member>()
  // @ts-ignore
  saving: boolean = false;
  // @ts-ignore

  editMember: Member;
  hiddenModal: boolean = true;
  // @ts-ignore
  memberEdited: Member = null;
  // @ts-ignore
  idEditMemeber: string
  // @ts-ignore

  term: string = "";
  deletedMemberId: string = ""
  spinnerMember: boolean = false;

  deletedModal: Modal | null = null;
  crudModal: Modal | null = null;

  ngAfterViewInit(): void {
    setTimeout(() => {
      const modalDEl = document.getElementById('delete-modal-member');
      const modalCrud = document.getElementById('crud-modal-member');

      if (modalDEl && !this.deletedModal) {
        this.deletedModal = new Modal(modalDEl);
      }

      if (modalCrud && !this.crudModal) {
        this.crudModal = new Modal(modalCrud);
      }
    }, 100); // 100ms delay pour attendre que le DOM soit prêt
  }

  constructor(private memberService: MemberService,private projectService:ProjectService, private message: ToastrService) { }

  ngOnInit(): void {
    this.listOfOption=[]
    this.listOfSelectedValue=[]
    this.spinnerMember = true

    // @ts-ignore
    this.projectService.getAllProjects().subscribe((projects:Array<Project>)=>{
      this.listOfOption =projects.map(item => ({
        value: item._id,
        label: item.nom
      }));
      this.listOfSelectedValue=projects.map(item => item._id);
    })
    // @ts-ignore


    this.memberService.getAllMembers().subscribe((members: Array<Member>) => {


      this.spinnerMember = false
      this.members = members
    }, () => {
      this.spinnerMember = false
      this.message.error("Une erreur est survenue ! ")
    })
  }
  onAddStock(f: NgForm, member: Member) {

    if (f.valid) {

    console.log(f.value);
    

      if (this.type !== "Edit") {
        this.saving = true
        this.memberService.addMember(f.value).subscribe((res: any) => {
          this.saving = false
          this.message.success(res.message)
          f.resetForm()
          this.ngOnInit()

          this.crudModal?.hide()
        }, e => {
          this.saving = false
          this.message.error(e.error)
        })
      } else {
        this.saving = true
        this.memberService.editMember(this.idEditMemeber, f.value).subscribe((res: any) => {
          this.saving = false
          this.message.success(res.message)
          this.crudModal?.hide()
          f.resetForm()
          this.ngOnInit()
          window.location.reload()
          this.hiddenModal = true
        }, e => {
          this.saving = false
          this.message.error(e.error)
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
    /*if (_id) {
      this.modal.confirm({
        nzTitle: 'Vous êtes sûr de supprimer cet utilisateur ?',
        nzContent: "' " + nom + " '",
        nzOkText: 'Yes',
        nzOkType: 'primary',
        nzOkDanger: true,
        nzOnOk: () => this.deleteMember(_id),
        nzCancelText: 'No',
      });
    }*/
  }

  deleteMember(_id: string) {
    if (_id) {
      this.memberService.deleteMember(_id).subscribe((res: any) => {
        this.message.success(res.message)
        this.ngOnInit()
      }, e => {
        this.message.error(e.error)
      })
    }
    ;
  }

  onFitchMember(member: Member) {
   
    
    this.idEditMemeber = member?._id
    this.type = "Edit"
    this.memberEdited = member
    this.listOfSelectedProjects=this.memberEdited.projects.map(p=>p._id)
    this.crudModal?.show()

  }
  openDeletedModal(arg0: string) {


    this.deletedMemberId = arg0
    this.deletedModal?.show()
  }
  openCrudModal() {
    this.type = "Create"
    this.crudModal?.show()
  }
onChangeNotification(arg0: string,arg1: Boolean) {
  const value = {notification:!arg1}
  this.memberService.changeNotification(arg0,value).subscribe((result:any)=>{
    this.message.success(result.message)
    this.ngOnInit()
  },err=>{
    this.message.error("Une erreur est survenue lors du modification")
    this.ngOnInit()
  })
  
}
selectedProjectIds(): string[] {
  
  
  if (this.type === 'Edit' && this.memberEdited?.projects) {
   
    
    return this.memberEdited.projects.map(p => p._id);
  }
  return [];
}

}

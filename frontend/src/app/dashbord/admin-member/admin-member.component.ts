import { Component, OnInit } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import {config} from "../../../Config/config";
import { Member } from 'src/app/models/member';
import { MemberService } from 'src/app/services/member.service';
import { error } from '@ant-design/icons-angular';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-admin-member',
  templateUrl: './admin-member.component.html',
  styleUrls: ['./admin-member.component.scss']
})
export class AdminMemberComponent implements OnInit {
itemsPerPage: number = 20;
  page:number=1;
  // @ts-ignore
  type: string = "Create"

  // @ts-ignore
  members: Array<Member>=new Array<Member>()
  // @ts-ignore
  saving: boolean = false;
  // @ts-ignore
  type: string;
  // @ts-ignore
  editMember: Member;
  hiddenModal: boolean = true;
  // @ts-ignore
  memberEdited: Member = null;
  // @ts-ignore
  idEditMemeber: string
  // @ts-ignore
  
  term: string = "";
  spinnerMember: boolean=false;
  constructor(private memberService:MemberService,private message:NzMessageService,private modal:NzModalService) { }

  ngOnInit(): void {
        document.body.style.paddingLeft = "15rem"
        this.spinnerMember=true
        // @ts-ignore
    
        this.memberService.getAllMembers().subscribe((members:Array<Member>)=>{
      
          
          this.spinnerMember=false
          this.members=members
        },()=>{
          this.spinnerMember=false
          this.message.error("Une erreur est survenue ! ", {nzDuration: config.durationMessage})
        })
  }
 onAddStock(f: NgForm, member: Member) {
  
    if (f.valid) {
    
    

      if (this.type !== "Edit") {
        this.saving = true
        this.memberService.addMember(f.value).subscribe((res: any) => {
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
        this.memberService.editMember(this.idEditMemeber, f.value).subscribe((res: any) => {
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
        nzTitle: 'Vous êtes sûr de supprimer cet utilisateur ?',
        nzContent: "' " + nom + " '",
        nzOkText: 'Yes',
        nzOkType: 'primary',
        nzOkDanger: true,
        nzOnOk: () => this.deleteMember(_id),
        nzCancelText: 'No',
      });
    }
  }

  deleteMember(_id: string) {
    if (_id) {
      this.memberService.deleteMember(_id).subscribe((res: any) => {
        this.message.success(res.message, {nzDuration: config.durationMessage})
        this.ngOnInit()
      }, e => {
        this.message.error(e.error, {nzDuration: config.durationMessage})
      })
    }
    ;
  }

  onFitchMember(member:Member) {
    this.idEditMemeber = member?._id
    this.type = "Edit"
    this.memberEdited = member
    this.hiddenModal = false

  }
  

}

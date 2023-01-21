import {Component, OnDestroy, OnInit} from '@angular/core';
import {MemberService} from "../../services/member.service";
import {Member} from "../../models/member";
import {Site} from "../../models/site";
import {config} from "../../../Config/config";
import {NzModalService} from "ng-zorro-antd/modal";
import {NzMessageService} from "ng-zorro-antd/message";
import {NgForm} from "@angular/forms";

@Component({
  selector: 'app-admin-user',
  templateUrl: './admin-user.component.html',
  styleUrls: ['./admin-user.component.scss']
})
export class AdminUserComponent implements OnInit,OnDestroy {
  itemsPerPage: number = config.itemsPerPage;
  page:number=1;
  // @ts-ignore
  type: string = "Create"

  // @ts-ignore
  type: string;
  // @ts-ignore
  editSite: Site;
  hiddenModal: boolean = true;
  // @ts-ignore
  users:Array<Member> = new Array<Member>()
  term: string = "";
  spinnerMember: boolean=false;
  // @ts-ignore
  memberEdited: Member = null;
  // @ts-ignore
  idEditMember: string
  constructor(private memberService:MemberService,private modal:NzModalService,private message:NzMessageService) { }

  ngOnInit(): void {
    document.body.style.paddingLeft = "15rem"
    this.spinnerMember=true

    // @ts-ignore
    this.memberService.getAllMembers().subscribe((users:Array<Member>)=>{
      this.spinnerMember=false
      this.users=users
    })
  }
  ngOnDestroy(): void {
    document.body.style.paddingLeft = "0rem"
  }

  onAddMember(f: NgForm, site: Site) {

    if (f.valid) {


      if (this.type !== "Edit") {

        this.memberService.addMember(f.value).subscribe((res: any) => {

          this.message.success(res.message, {nzDuration: config.durationMessage})
          this.ngOnInit()
          f.resetForm()
          this.hiddenModal = true
        }, e => {

          this.message.error(e.error, {nzDuration: config.durationMessage})
        })
      } else {

        this.memberService.editMember(this.idEditMember, f.value).subscribe((res: any) => {

          this.message.success(res.message, {nzDuration: config.durationMessage})
          this.ngOnInit()
          this.hiddenModal = true
        }, e => {
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

  getRole(isAdmin: boolean) {
    if(isAdmin) return "Administrateur"
    return "Operateur"
  }

  onFitchMember(user: Member) {
    this.idEditMember = user?._id
    this.type = "Edit"
    this.memberEdited = user
    this.hiddenModal = false

  }
  ShowModale(_id: string, nom: string) {
    if (_id) {
      this.modal.confirm({
        nzTitle: 'Vous êtes sûr de supprimer ce site ?',
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

  onCloseAddModal() {
    this.hiddenModal = true
  }
}

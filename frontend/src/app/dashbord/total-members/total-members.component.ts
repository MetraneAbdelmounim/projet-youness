import { Component, OnInit } from '@angular/core';
import { MemberService } from 'src/app/services/member.service';

@Component({
  selector: 'app-total-members',
  templateUrl: './total-members.component.html',
  styleUrls: ['./total-members.component.scss']
})
export class TotalMembersComponent implements OnInit {

  // @ts-ignore
    members: Array<Member>=new Array<Member>()

  constructor(private memberService:MemberService) { }

  ngOnInit(): void {

    // @ts-ignore
    this.memberService.getAllMembers().subscribe((members:Array<Member>)=>{
      
      this.members=members
    })

  }

}

import { Component, OnInit } from '@angular/core';
import { MemberService } from '../../services/member.service';

@Component({
  selector: 'app-total-members',
  standalone: false,
  templateUrl: './total-members.component.html',
  styleUrl: './total-members.component.css'
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

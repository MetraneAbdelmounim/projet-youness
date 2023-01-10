import {Component, OnDestroy, OnInit} from '@angular/core';
import {NgForm} from "@angular/forms";
import {LoginService} from "../services/login.service";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit,OnDestroy {

  constructor(private loginService:LoginService) { }

  ngOnInit(): void {
    document.body.className="body"
  }

  onSignIn(f: NgForm) {
    if(f.valid){
      this.loginService.signIn(f.value['username'],f.value['password'])
    }
  }

  ngOnDestroy(): void {
    document.body.className=""
  }
}

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {NgForm} from "@angular/forms";
//import { AuthService } from '../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { LoginService } from '../services/login.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone:false,
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  Date : Date = new Date()
  formData = {
    username: '',
    password: ''
  };
  showPassword = false;
  isLoading = false;
  images: string[] = [
    'assets/images/bg3.jpg',
    'assets/images/bg.jpg',
    'assets/images/bg2.jpg'
  ];
  currentImageIndex = 0;
  // @ts-ignore
  private authListenerSub : Subscription;
  memberIsAuthenticated : boolean = false;

  constructor(
   // private authService: AuthService,
    private router: Router,
    private toast: ToastrService,
    private loginService:LoginService
  ) {}

  ngOnInit(): void {
    setInterval(() => {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
    }, 5000);
    this.memberIsAuthenticated = this.loginService.getAuthStatus();
    this.authListenerSub = this.loginService.getAuthStatusListener()
      .subscribe((isAuthenticated)=> {
        this.memberIsAuthenticated = isAuthenticated;
        if(this.memberIsAuthenticated){

          this.router.navigate(['projects'])
        }
      });
    this.memberIsAuthenticated = this.loginService.getAuthStatus();
    if(this.memberIsAuthenticated) {
      this.router.navigate(['projects'])
    }
  }

  onSignIn(f: NgForm) {
    if(f.valid){
      this.loginService.signIn(f.value['username'],f.value['password'])
    }
  }
}

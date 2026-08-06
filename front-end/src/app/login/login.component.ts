import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { Subscription } from 'rxjs';
import { LoginService } from '../services/login.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit, OnDestroy {
  readonly today = new Date();
  readonly images = ['assets/images/bg3.jpg', 'assets/images/bg.jpg', 'assets/images/bg2.jpg'];

  currentImageIndex = 0;
  showPassword = false;

  private carousel?: ReturnType<typeof setInterval>;
  private readonly subscriptions = new Subscription();

  constructor(
    private router: Router,
    private loginService: LoginService
  ) {}

  ngOnInit(): void {
    // Cleared on destroy — the previous interval ran for the lifetime of the
    // tab, long after the login screen had gone.
    this.carousel = setInterval(() => {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
    }, 6000);

    if (this.loginService.getAuthStatus()) {
      void this.router.navigate(['/projects']);
      return;
    }

    this.subscriptions.add(
      this.loginService.getAuthStatusListener().subscribe((isAuthenticated) => {
        if (isAuthenticated) void this.router.navigate(['/projects']);
      })
    );
  }

  ngOnDestroy(): void {
    clearInterval(this.carousel);
    this.subscriptions.unsubscribe();
  }

  onSignIn(form: NgForm): void {
    if (!form.valid) return;
    this.loginService.signIn(form.value.username, form.value.password);
  }
}

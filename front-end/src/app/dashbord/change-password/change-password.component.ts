import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { LoginService } from '../../services/login.service';
import { MemberService } from '../../services/member.service';

@Component({
  selector: 'app-change-password',
  standalone: false,
  templateUrl: './change-password.component.html',
})
export class ChangePasswordComponent implements OnInit, OnDestroy {
  idMember = '';

  private readonly subscriptions = new Subscription();

  constructor(
    private loginService: LoginService,
    private memberService: MemberService,
    private toaster: ToastrService
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.loginService.getCurrentMember().subscribe((member) => {
        this.idMember = member?._id ?? '';
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * The API requires the current password for a self-service change, so the
   * form must supply `currentPass` alongside the new value.
   */
  onChangePassword(form: NgForm): void {
    if (!form.valid || !this.idMember) return;

    this.memberService.editPassword(this.idMember, form.value).subscribe({
      next: (result) => {
        this.toaster.success(result.message);
        form.resetForm();
        // The password changed, so the current session is retired.
        this.loginService.logout();
      },
      error: (err) => {
        this.toaster.error(err?.error?.error ?? 'Modification impossible');
      },
    });
  }
}

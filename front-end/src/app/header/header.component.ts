import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoginService } from '../services/login.service';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit, OnDestroy {
  memberIsAuthenticated = false;
  username = '';
  role = '';
  isAdmin = false;
  menuOpen = false;

  private readonly subscriptions = new Subscription();

  constructor(
    private loginService: LoginService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.loginService.getAuthStatusListener().subscribe((isAuthenticated) => {
        this.memberIsAuthenticated = isAuthenticated;
        if (!isAuthenticated) this.menuOpen = false;
      })
    );

    this.subscriptions.add(
      this.loginService.getCurrentMember().subscribe((member) => {
        this.username = member?.username ?? '';
        this.isAdmin = member?.isAdmin ?? false;
        this.role = this.isAdmin ? 'Administrateur' : 'Utilisateur';
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /** Closes the account menu on any click outside it, and on Escape. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const host = (event.target as HTMLElement).closest('[aria-haspopup="menu"], [role="menu"]');
    if (!host) this.menuOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuOpen = false;
  }

  get initials(): string {
    return (this.username || '?').slice(0, 2).toUpperCase();
  }

  onLogout(): void {
    this.menuOpen = false;
    this.loginService.logout();
  }

  home(): void {
    void this.router.navigate(['/projects']);
  }
}

import { Component, OnDestroy, OnInit } from '@angular/core';
import { I18nService } from './i18n/i18n.service';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { LoginService } from './services/login.service';
import { LicenceService } from './services/licence.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit, OnDestroy {
  memberIsAuthenticated = false;
  isAdmin = false;
  licenceWarning: string | null = null;
  private currentUrl = '';

  private readonly subscriptions = new Subscription();

  constructor(
    private router: Router,
    private loginService: LoginService,
    private licence: LicenceService,
    // Injected for its constructor side effect: the theme must be applied
    // before first paint, not when some component happens to ask for it.
    public theme: ThemeService,
    private i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.loginService.autoAuthUser();
    this.memberIsAuthenticated = this.loginService.getAuthStatus();

    this.subscriptions.add(
      this.loginService.getAuthStatusListener().subscribe((isAuthenticated) => {
        this.memberIsAuthenticated = isAuthenticated;
      })
    );

    this.subscriptions.add(
      this.licence.watch().subscribe((status) => {
        this.licenceWarning =
          status.valid && status.daysRemaining !== undefined && status.daysRemaining <= 30
            ? this.i18n.t('licence.expiresIn', { days: status.daysRemaining })
            : null;
      })
    );
    this.licence.refresh().subscribe();

    this.subscriptions.add(
      this.loginService.getCurrentMember().subscribe((member) => {
        this.isAdmin = member?.isAdmin ?? false;
      })
    );

    this.currentUrl = this.router.url;
    this.subscriptions.add(
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe((event) => {
          // Tracked explicitly: reading router.url from a template getter is
          // evaluated on every change-detection pass.
          this.currentUrl = event.urlAfterRedirects;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /** The licence screen and login own the full viewport — no app chrome. */
  get chromeless(): boolean {
    return this.currentUrl === '/' || this.currentUrl.startsWith('/licence');
  }

  /**
   * Admin tabs appear across the whole /dashbord section, but not on
   * change-password — that page is reachable by every member, admin or not.
   */
  get showAdminNav(): boolean {
    return (
      this.isAdmin &&
      this.currentUrl.startsWith('/dashbord/') &&
      !this.currentUrl.startsWith('/dashbord/change-password')
    );
  }
}

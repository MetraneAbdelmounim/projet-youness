import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslationKey } from '../i18n/fr';

/**
 * Sub-navigation across the administration section.
 *
 * The old layout reached these pages through a sidebar component. When that was
 * replaced by the top header, only Stations kept a link — Modems, Panneaux,
 * Projets and Utilisateurs were still routed but unreachable. Rendering the
 * tabs from a single list means adding an admin page can no longer leave it
 * stranded.
 */
@Component({
  selector: 'app-admin-nav',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="border-b border-line bg-surface" [attr.aria-label]="'adminNav.aria' | t">
      <div class="admin-tabs mx-auto max-w-7xl px-4 sm:px-6">
        <a *ngFor="let tab of tabs" [routerLink]="tab.link"
           routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }"
           #rla="routerLinkActive" [attr.aria-current]="rla.isActive ? 'page' : null"
           class="admin-tab">
          <span aria-hidden="true">{{ tab.icon }}</span>
          {{ tab.label | t }}
        </a>
      </div>
    </nav>
  `,
})
export class AdminNavComponent {
  readonly tabs: { label: TranslationKey; icon: string; link: string }[] = [
    { label: 'adminNav.stations', icon: '🔌', link: '/dashbord/sites' },
    { label: 'adminNav.modems', icon: '📡', link: '/dashbord/modems' },
    { label: 'adminNav.panels', icon: '🪧', link: '/dashbord/panneaux' },
    { label: 'adminNav.projects', icon: '🗂️', link: '/dashbord/projects' },
    { label: 'adminNav.users', icon: '👥', link: '/dashbord/members' },
    { label: 'adminNav.licence', icon: '🔑', link: '/dashbord/licence' },
    { label: 'adminNav.settings', icon: '⚙️', link: '/dashbord/settings' },
  ];
}

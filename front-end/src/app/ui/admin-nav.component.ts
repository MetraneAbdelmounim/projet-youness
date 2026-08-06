import { ChangeDetectionStrategy, Component } from '@angular/core';

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
    <nav class="border-b border-line bg-surface" aria-label="Administration">
      <div class="admin-tabs mx-auto max-w-7xl px-4 sm:px-6">
        <a *ngFor="let tab of tabs" [routerLink]="tab.link"
           routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }"
           #rla="routerLinkActive" [attr.aria-current]="rla.isActive ? 'page' : null"
           class="admin-tab">
          <span aria-hidden="true">{{ tab.icon }}</span>
          {{ tab.label }}
        </a>
      </div>
    </nav>
  `,
})
export class AdminNavComponent {
  readonly tabs = [
    { label: 'Stations', icon: '🔌', link: '/dashbord/sites' },
    { label: 'Modems', icon: '📡', link: '/dashbord/modems' },
    { label: 'Panneaux', icon: '🪧', link: '/dashbord/panneaux' },
    { label: 'Projets', icon: '🗂️', link: '/dashbord/projects' },
    { label: 'Utilisateurs', icon: '👥', link: '/dashbord/members' },
    { label: 'Licence', icon: '🔑', link: '/dashbord/licence' },
  ];
}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ThemeService } from '../services/theme.service';

/** Cycles light → dark → system. The current mode is announced, not implied. */
@Component({
  selector: 'app-theme-toggle',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" (click)="theme.toggle()"
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line
                   text-ink-secondary transition hover:bg-hover hover:text-ink"
            [title]="title" [attr.aria-label]="title">

      <svg *ngIf="theme.mode() === 'light'" class="h-4.5 w-4.5" fill="none" stroke="currentColor"
           stroke-width="1.8" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4" />
        <path stroke-linecap="round" d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>

      <svg *ngIf="theme.mode() === 'dark'" class="h-4.5 w-4.5" fill="none" stroke="currentColor"
           stroke-width="1.8" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round"
              d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
      </svg>

      <svg *ngIf="theme.mode() === 'system'" class="h-4.5 w-4.5" fill="none" stroke="currentColor"
           stroke-width="1.8" viewBox="0 0 24 24">
        <rect x="2.5" y="4" width="19" height="13" rx="2" />
        <path stroke-linecap="round" d="M8.5 20.5h7" />
      </svg>
    </button>
  `,
})
export class ThemeToggleComponent {
  constructor(public theme: ThemeService) {}

  get title(): string {
    return {
      light: 'Thème clair — cliquez pour le thème sombre',
      dark: 'Thème sombre — cliquez pour suivre le système',
      system: `Thème système (${this.theme.resolved() === 'dark' ? 'sombre' : 'clair'}) — cliquez pour le thème clair`,
    }[this.theme.mode()];
  }
}

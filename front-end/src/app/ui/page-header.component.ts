import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Consistent page title block, with a slot for page-level actions. */
@Component({
  selector: 'app-page-header',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <a *ngIf="backLink" [routerLink]="backLink"
           class="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-brand-ink transition">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {{ backLabel }}
        </a>
        <h1 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{{ title }}</h1>
        <p *ngIf="subtitle" class="mt-1 text-sm text-ink-secondary">{{ subtitle }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ng-content></ng-content>
      </div>
    </header>
  `,
})
export class PageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() backLink: unknown[] | string | null = null;
  @Input() backLabel = 'Retour';
}

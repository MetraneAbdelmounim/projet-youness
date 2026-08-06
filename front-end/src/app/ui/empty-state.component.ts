import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Shared empty state so every list says "nothing here" the same way. */
@Component({
  selector: 'app-empty-state',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center py-20 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-sunken text-3xl" aria-hidden="true">
        {{ icon }}
      </div>
      <h3 class="mt-5 text-lg font-semibold text-ink">{{ title }}</h3>
      <p class="mt-1.5 max-w-sm text-sm text-ink-muted">{{ description }}</p>
      <ng-content></ng-content>
    </div>
  `,
})
export class EmptyStateComponent {
  @Input({ required: true }) title = '';
  @Input() description = '';
  @Input() icon = '📭';
}

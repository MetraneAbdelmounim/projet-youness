import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { StatusTone } from './status-chip.component';

/**
 * A single headline figure.
 *
 * Per the "is it even a chart?" rule, one number is better served by a tile
 * than by a plot with a single bar — these replace the decorative mini-charts
 * that previously stood in for counts.
 */
@Component({
  selector: 'app-stat-tile',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card p-5">
      <div class="flex items-start justify-between gap-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">{{ label }}</p>
        <span *ngIf="icon" class="text-lg leading-none" aria-hidden="true">{{ icon }}</span>
      </div>

      <p class="mt-3 text-3xl font-bold tnum" [ngClass]="valueClass">
        {{ value }}<span *ngIf="unit" class="ml-1 text-base font-medium text-ink-muted">{{ unit }}</span>
      </p>

      <p *ngIf="hint" class="mt-1 text-xs text-ink-muted">{{ hint }}</p>
    </div>
  `,
})
export class StatTileComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value: string | number = '—';
  @Input() unit = '';
  @Input() hint = '';
  @Input() icon = '';
  @Input() tone: StatusTone | 'default' = 'default';

  get valueClass(): string {
    return {
      good: 'text-good',
      warn: 'text-warn',
      crit: 'text-crit',
      neutral: 'text-ink-secondary',
      default: 'text-ink',
    }[this.tone];
  }
}

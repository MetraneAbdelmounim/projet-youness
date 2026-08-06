import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type StatusTone = 'good' | 'warn' | 'crit' | 'neutral';

/**
 * Status pill.
 *
 * Always renders a dot *and* a text label — status is never communicated by
 * colour alone, which matters both for colour-vision deficiency and for the
 * red/amber pair, which is the hardest to separate on a dark surface.
 */
@Component({
  selector: 'app-status-chip',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="chip" [ngClass]="'chip-' + tone" [title]="title || ''">
      <span class="chip-dot" [class.live-dot]="pulse && tone === 'good'"></span>
      {{ label }}
    </span>
  `,
})
export class StatusChipComponent {
  @Input({ required: true }) label = '';
  @Input() tone: StatusTone = 'neutral';
  @Input() title = '';
  /** Animates the dot — reserved for genuinely live signals. */
  @Input() pulse = false;
}

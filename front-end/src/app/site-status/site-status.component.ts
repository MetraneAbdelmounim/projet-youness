import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Online/offline badge.
 *
 * Reachability comes from the parent's already-loaded data. Previously each
 * badge issued its own request, which triggered a server-side ICMP probe per
 * rendered row.
 */
@Component({
  selector: 'app-site-status',
  standalone: false,
  templateUrl: './site-status.component.html',
  styleUrl: './site-status.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteStatusComponent {
  @Input({ required: true }) isAlive = false;
  @Input() lastSeenAt: string | null = null;
}

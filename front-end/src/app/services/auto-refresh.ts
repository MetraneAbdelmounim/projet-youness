import { EMPTY, Observable, fromEvent, timer } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';

/**
 * How often open screens re-read station data.
 *
 * One indexed MongoDB query per tick — cheap enough to keep short, and it caps
 * how long a restart can sit unnoticed on a screen somebody is watching.
 */
export const REFRESH_INTERVAL_MS = 15_000;

/**
 * Ticks on an interval, but only while the tab is visible.
 *
 * These screens show live telemetry that a background poller refreshes every
 * few minutes; without this they display whatever was true when the page was
 * opened, so a station that rebooted minutes ago still reads "En ligne".
 *
 * Pausing on a hidden tab matters: a dashboard left open on a spare monitor
 * would otherwise query all day for nobody's benefit. The first tick fires one
 * interval in, never immediately — the caller has just loaded the data.
 */
export function refreshWhileVisible(intervalMs = REFRESH_INTERVAL_MS): Observable<number> {
  return fromEvent(document, 'visibilitychange').pipe(
    startWith(null),
    map(() => !document.hidden),
    switchMap((visible) => (visible ? timer(intervalMs, intervalMs) : EMPTY))
  );
}

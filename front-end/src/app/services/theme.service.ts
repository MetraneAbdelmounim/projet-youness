import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable, distinctUntilChanged, skip } from 'rxjs';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme';

/**
 * Owns the light/dark decision for the whole app.
 *
 * The chosen mode is persisted; "system" follows the OS and keeps following it,
 * so a user who changes their machine's appearance sees the app follow without
 * revisiting a setting.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  /** The user's preference, which may be "system". */
  readonly mode = signal<ThemeMode>('system');
  /** What is actually on screen once "system" is resolved. */
  readonly resolved = signal<'light' | 'dark'>('light');

  private readonly resolved$ = new BehaviorSubject<'light' | 'dark'>('light');
  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    this.mode.set(stored === 'light' || stored === 'dark' ? stored : 'system');

    this.media.addEventListener('change', () => {
      if (this.mode() === 'system') this.apply();
    });

    this.apply();
  }

  set(mode: ThemeMode): void {
    this.mode.set(mode);
    if (mode === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, mode);
    this.apply();
  }

  /** Cycles light → dark → system, which is what the header button does. */
  toggle(): void {
    const next: Record<ThemeMode, ThemeMode> = { light: 'dark', dark: 'system', system: 'light' };
    this.set(next[this.mode()]);
  }

  /**
   * Emits on every *actual* appearance change, skipping the initial value.
   *
   * Charts read their colours from CSS tokens, so each one subscribes to this
   * to repaint rather than polling the DOM for a class change.
   */
  changes(): Observable<'light' | 'dark'> {
    return this.resolved$.pipe(distinctUntilChanged(), skip(1));
  }

  private apply(): void {
    const dark = this.mode() === 'dark' || (this.mode() === 'system' && this.media.matches);
    document.documentElement.classList.toggle('dark', dark);
    const resolved = dark ? 'dark' : 'light';
    this.resolved.set(resolved);
    this.resolved$.next(resolved);
  }
}

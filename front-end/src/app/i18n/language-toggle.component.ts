import { Component } from '@angular/core';
import { I18nService, Language } from './i18n.service';

/**
 * FR / EN switch.
 *
 * A two-state segmented control rather than a dropdown: with exactly two
 * options a menu costs an extra click to show what a pair of buttons already
 * says, and the current language stays visible at a glance.
 */
@Component({
  selector: 'app-language-toggle',
  standalone: false,
  template: `
    <div class="flex items-center rounded-lg border border-line p-0.5"
         role="group" [attr.aria-label]="'nav.languageAria' | t">
      <button *ngFor="let option of options" type="button" (click)="select(option)"
              [attr.aria-pressed]="i18n.lang() === option"
              class="rounded-md px-2 py-1 text-xs font-semibold uppercase transition"
              [class.bg-brand]="i18n.lang() === option"
              [class.text-ink-inverse]="i18n.lang() === option"
              [class.text-ink-muted]="i18n.lang() !== option"
              [class.hover:bg-hover]="i18n.lang() !== option">
        {{ option }}
      </button>
    </div>
  `,
})
export class LanguageToggleComponent {
  readonly options: Language[] = ['fr', 'en'];

  constructor(public i18n: I18nService) {}

  select(language: Language): void {
    this.i18n.use(language);
  }
}

import { Injectable, signal } from '@angular/core';
import { Dictionary, TranslationKey, fr } from './fr';
import { en } from './en';

export type Language = 'fr' | 'en';

export const LANGUAGE_STORAGE_KEY = 'lang';

const DICTIONARIES: Record<Language, Dictionary> = { fr, en };

/** Locale tags for Intl formatting, kept beside the dictionaries they belong to. */
const LOCALES: Record<Language, string> = { fr: 'fr-CA', en: 'en-CA' };

/**
 * Resolves the language to start in.
 *
 * Exported so main.ts can set `<html lang>` before Angular boots — assistive
 * technology and the browser's own translation prompt both read that attribute
 * on first paint, and correcting it later is too late.
 */
export function initialLanguage(): Language {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === 'fr' || stored === 'en') return stored;
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'fr';
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  /**
   * A signal rather than a BehaviorSubject: read inside the translate pipe, it
   * registers the template as a dependency, so even OnPush components are
   * marked dirty when the language changes.
   */
  readonly lang = signal<Language>(initialLanguage());

  /** BCP 47 tag for Intl / toLocaleString. */
  get locale(): string {
    return LOCALES[this.lang()];
  }

  use(language: Language): void {
    if (language === this.lang()) return;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
    this.lang.set(language);
  }

  toggle(): void {
    this.use(this.lang() === 'fr' ? 'en' : 'fr');
  }

  /**
   * Translates a key, substituting {placeholders}.
   *
   * An unknown key returns the key itself: a visible `home.title` in the UI is
   * a bug report, whereas an empty string silently swallows the mistake.
   */
  t(key: TranslationKey, params?: Record<string, string | number>): string {
    const template = DICTIONARIES[this.lang()][key] ?? fr[key] ?? key;
    if (!params) return template;

    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match
    );
  }
}

import { Pipe, PipeTransform } from '@angular/core';
import { TranslationKey } from './fr';
import { I18nService } from './i18n.service';

/**
 * `{{ 'home.title' | t }}` — with optional parameters:
 * `{{ 'home.subtitle' | t: { project: name, count: sites.length } }}`
 *
 * Impure on purpose. A pure pipe caches by its arguments, and the key does not
 * change when the language does — every string on screen would keep its old
 * translation until something else happened to re-render it. The work per call
 * is one map lookup, which is why re-running it each change-detection pass
 * costs nothing measurable.
 */
@Pipe({ name: 't', standalone: false, pure: false })
export class TranslatePipe implements PipeTransform {
  constructor(private i18n: I18nService) {}

  transform(key: TranslationKey, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}

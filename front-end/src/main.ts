import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { initialLanguage } from './app/i18n/i18n.service';

/**
 * Applies the stored theme before Angular boots.
 *
 * Doing this here rather than in a component avoids a flash of the wrong
 * palette on load, and avoids an inline <script> in index.html, which the
 * Content-Security-Policy would refuse to execute.
 */
(() => {
  const stored = localStorage.getItem('theme');
  const dark =
    stored === 'dark' ||
    (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);

  // Assistive technology and the browser's translation prompt both read this on
  // first paint, so it has to be right before Angular renders anything.
  document.documentElement.lang = initialLanguage();
})();

platformBrowserDynamic()
  .bootstrapModule(AppModule, { ngZoneEventCoalescing: true })
  .catch((err) => console.error(err));

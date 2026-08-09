import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { I18nService } from '../../i18n/i18n.service';
import { TranslationKey } from '../../i18n/fr';
import {
  AppSettings,
  MailTestResult,
  SettingsService,
} from '../../services/settings.service';

const HOUR_MS = 60 * 60 * 1000;

/** Common cron expressions, so the cadence is not a guessing game. */
const ALERT_PRESETS: { label: TranslationKey; value: string }[] = [
  { label: 'settings.every5', value: '*/5 * * * *' },
  { label: 'settings.every15', value: '*/15 * * * *' },
  { label: 'settings.every30', value: '*/30 * * * *' },
  { label: 'settings.hourly', value: '0 * * * *' },
];

const NIGHTLY_PRESETS: { label: TranslationKey; value: string }[] = [
  { label: 'settings.midnight', value: '0 0 * * *' },
  { label: 'settings.at1am', value: '0 1 * * *' },
  { label: 'settings.at3am', value: '0 3 * * *' },
  { label: 'settings.sundayMidnight', value: '0 0 * * 0' },
];

/**
 * Editable form state.
 *
 * Held separately from the server's values so "Réinitialiser" can restore the
 * .env default without a round trip, and so an unsaved edit is visibly distinct
 * from what is actually in force.
 */
interface FormState {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  mailFrom: string;
  memberDomain: string;
  alertCron: string;
  nightlyCron: string;
  timezone: string;
  reminderHours: number;
  reloadMidnight: boolean;
}

@Component({
  selector: 'app-admin-settings',
  standalone: false,
  templateUrl: './admin-settings.component.html',
})
export class AdminSettingsComponent implements OnInit {
  readonly alertPresets = ALERT_PRESETS;
  readonly nightlyPresets = NIGHTLY_PRESETS;

  loading = true;
  saving = false;
  testing = false;

  /** Whether a password is stored, since its value is never sent to us. */
  passwordStored = false;
  testResult: MailTestResult | null = null;
  testRecipient = '';

  defaults: AppSettings | null = null;
  form: FormState = this.blank();

  private serverValues: AppSettings | null = null;

  constructor(
    private settings: SettingsService,
    private message: ToastrService,
    private i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  private blank(): FormState {
    return {
      smtpHost: '',
      smtpPort: 25,
      smtpSecure: false,
      smtpUser: '',
      smtpPass: '',
      mailFrom: '',
      memberDomain: '',
      alertCron: '',
      nightlyCron: '',
      timezone: '',
      reminderHours: 12,
      reloadMidnight: false,
    };
  }

  private toForm(v: AppSettings): FormState {
    return {
      smtpHost: v['smtp.host'],
      smtpPort: v['smtp.port'],
      smtpSecure: v['smtp.secure'],
      smtpUser: v['smtp.user'],
      // Always blank: an empty field means "keep the stored password".
      smtpPass: '',
      mailFrom: v['mail.from'],
      memberDomain: v['mail.memberDomain'],
      alertCron: v['schedule.alert'],
      nightlyCron: v['schedule.nightly'],
      timezone: v['schedule.timezone'],
      reminderHours: Math.round(v['alert.reminderIntervalMs'] / HOUR_MS),
      reloadMidnight: v.reloadMidnight,
    };
  }

  private load(): void {
    this.loading = true;
    this.settings.get().subscribe({
      next: ({ values, defaults }) => {
        this.serverValues = values;
        this.defaults = defaults;
        this.passwordStored = values['smtp.pass.isSet'];
        this.form = this.toForm(values);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.message.error(this.i18n.t('settings.loadFailed'));
      },
    });
  }

  /** True when the field differs from what .env specifies. */
  overridden(key: keyof AppSettings): boolean {
    if (!this.defaults || !this.serverValues) return false;
    return this.serverValues[key] !== this.defaults[key];
  }

  /** Human-readable default, for the hint under each field. */
  defaultOf(key: keyof AppSettings): string {
    if (!this.defaults) return '';
    const value = this.defaults[key];
    if (key === 'alert.reminderIntervalMs') return `${Math.round(Number(value) / HOUR_MS)} h`;
    if (typeof value === 'boolean') return this.i18n.t(value ? 'common.yes' : 'common.no');
    return value === '' ? this.i18n.t('settings.emptyValue') : String(value);
  }

  save(): void {
    if (this.saving) return;

    const patch: Record<string, unknown> = {
      'smtp.host': this.form.smtpHost,
      'smtp.port': Number(this.form.smtpPort),
      'smtp.secure': this.form.smtpSecure,
      'smtp.user': this.form.smtpUser,
      'mail.from': this.form.mailFrom,
      'mail.memberDomain': this.form.memberDomain,
      'schedule.alert': this.form.alertCron,
      'schedule.nightly': this.form.nightlyCron,
      'schedule.timezone': this.form.timezone,
      'alert.reminderIntervalMs': Number(this.form.reminderHours) * HOUR_MS,
      reloadMidnight: this.form.reloadMidnight,
    };

    // Sent only when the operator typed one; the API reads an absent key as
    // "leave the stored password alone".
    if (this.form.smtpPass) patch['smtp.pass'] = this.form.smtpPass;

    this.saving = true;
    this.settings.update(patch).subscribe({
      next: ({ values }) => {
        this.serverValues = values;
        this.passwordStored = values['smtp.pass.isSet'];
        this.form = this.toForm(values);
        this.saving = false;
        this.message.success(this.i18n.t('settings.saved'));
      },
      error: (err) => {
        this.saving = false;
        this.message.error(err?.error?.error || this.i18n.t('settings.saveFailed'));
      },
    });
  }

  /** Reverts every field to the .env value by clearing the stored overrides. */
  resetToEnv(): void {
    if (!this.defaults) return;

    const patch: Record<string, unknown> = {};
    for (const key of Object.keys(this.defaults)) {
      if (key.endsWith('.isSet')) continue;
      patch[key] = null;
    }
    patch['smtp.pass'] = null;

    this.saving = true;
    this.settings.update(patch).subscribe({
      next: ({ values }) => {
        this.serverValues = values;
        this.passwordStored = values['smtp.pass.isSet'];
        this.form = this.toForm(values);
        this.saving = false;
        this.message.success(this.i18n.t('settings.reset'));
      },
      error: () => {
        this.saving = false;
        this.message.error(this.i18n.t('settings.resetFailed'));
      },
    });
  }

  /**
   * Tests the configuration currently on screen, saved or not.
   *
   * Testing the stored values instead would mean saving a wrong server first,
   * which silently disables every alert until someone notices.
   */
  testMail(): void {
    if (this.testing) return;

    this.testing = true;
    this.testResult = null;

    this.settings
      .testMail({
        host: this.form.smtpHost,
        port: Number(this.form.smtpPort),
        secure: this.form.smtpSecure,
        user: this.form.smtpUser,
        pass: this.form.smtpPass,
        from: this.form.mailFrom,
        to: this.testRecipient || undefined,
      })
      .subscribe({
        next: (result) => {
          this.testResult = result;
          this.testing = false;
        },
        error: (err) => {
          this.testing = false;
          this.message.error(err?.error?.error || this.i18n.t('settings.testFailed'));
        },
      });
  }
}

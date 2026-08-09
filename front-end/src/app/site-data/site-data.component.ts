import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Reading } from '../models/site';
import { TranslationKey } from '../i18n/fr';

/**
 * Renders one station's telemetry.
 *
 * Purely presentational: the reading arrives from the parent, which already
 * received it with the station list. This component used to fetch its own data
 * in ngOnInit, so a list of N stations issued N requests — each one a live
 * Modbus read — before the page settled.
 */
@Component({
  selector: 'app-site-data',
  standalone: false,
  templateUrl: './site-data.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteDataComponent {
  /** Undefined when the station has never been polled; null-safe throughout. */
  @Input({ required: true }) reading!: Reading | null | undefined;

  get metrics(): { label: TranslationKey; icon: string; unit: string; value?: number | null }[] {
    const r = this.reading;
    return [
      { label: 'reading.arrayVoltage', icon: '☀️', unit: 'V', value: r?.Array_Voltage },
      { label: 'reading.chargeCurrent', icon: '⚡', unit: 'A', value: r?.Charge_Current },
      { label: 'reading.loadVoltage', icon: '🔌', unit: 'V', value: r?.Load_Voltage },
      { label: 'reading.loadCurrent', icon: '📈', unit: 'A', value: r?.Load_Current },
      { label: 'reading.batteryTemp', icon: '🌡️', unit: '°C', value: r?.Temperature_Battery },
      { label: 'reading.ambientTemp', icon: '🌤️', unit: '°C', value: r?.Temperature_Ambient },
    ];
  }

}

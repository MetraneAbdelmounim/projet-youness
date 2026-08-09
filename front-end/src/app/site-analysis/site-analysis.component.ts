import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslationKey } from '../i18n/fr';
import { Analysis } from '../models/site';
import { StatusTone } from '../ui/status-chip.component';

/**
 * Renders one station's weather-adjusted forecast.
 *
 * Presentational only. Each instance previously fetched its own analysis, and
 * every one of those calls performed a live Modbus read plus an uncached
 * open-meteo request — so opening the analysis page for a twenty-station
 * project made twenty of each.
 */
@Component({
  selector: 'app-site-analysis',
  standalone: false,
  templateUrl: './site-analysis.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteAnalysisComponent {
  /** Undefined until the poller has computed a forecast for this station. */
  @Input({ required: true }) analysis!: Analysis | null | undefined;

  /**
   * Whether the station is currently answering.
   *
   * A forecast is derived from a live reading, so once the station stops
   * responding the stored one describes a state that no longer holds. Showing
   * it — worse, showing "Performance élevée" for a station that is down — is
   * the same mistake as reporting 0 V for an unreachable device.
   */
  @Input() reachable = true;

  get available(): boolean {
    return this.reachable && !!this.analysis && this.analysis.performance !== 'UNKNOWN';
  }

  get metrics(): { label: TranslationKey; icon: string; unit: string; value?: number | null }[] {
    const a = this.analysis;
    return [
      { label: 'analysis.cloudCover', icon: '☁️', unit: '%', value: a?.avg_remaining_cloud },
      { label: 'analysis.remainingSun', icon: '🌞', unit: 'h', value: a?.remaining_sun_hours },
      { label: 'analysis.coldLoss', icon: '❄️', unit: '%', value: a?.battery_capacity_loss },
      { label: 'analysis.cloudLoss', icon: '🌥️', unit: '%', value: a?.solar_charge_loss_clouds },
      { label: 'analysis.chargeEfficiency', icon: '⚡', unit: '%', value: a?.solar_charge_efficiency },
      { label: 'analysis.predictedVoltage', icon: '🔋', unit: 'V', value: a?.predicted_end_day_voltage },
    ];
  }


  get performanceLabelKey(): TranslationKey {
    return (
      {
        UP: 'analysis.perfHigh',
        MEDIUM: 'analysis.perfMedium',
        DOWN: 'analysis.perfLow',
      } as const
    )[this.analysis?.performance as 'UP' | 'MEDIUM' | 'DOWN'] ?? 'analysis.perfUnknown';
  }

  get performanceTone(): StatusTone {
    return ({ UP: 'good', MEDIUM: 'warn', DOWN: 'crit' }[
      this.analysis?.performance as 'UP' | 'MEDIUM' | 'DOWN'
    ] ?? 'neutral') as StatusTone;
  }
}

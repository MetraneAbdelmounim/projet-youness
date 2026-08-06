import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a measurement, rendering "—" when there is no value.
 *
 * Measurements are nullable by design: the poller stores `null` when a register
 * could not be read, which keeps "unknown" distinct from a real reading of 0 V.
 * Templates were repeating `value != null ? (value | number) + ' V' : '—'`,
 * which is easy to get subtly wrong — and did, dropping the optional chain on
 * the true branch of the ternary.
 */
@Pipe({ name: 'measure', standalone: false, pure: true })
export class MeasurePipe implements PipeTransform {
  transform(value: number | null | undefined, unit = '', digits = 2): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    const formatted = value.toFixed(digits);
    return unit ? `${formatted} ${unit}` : formatted;
  }
}

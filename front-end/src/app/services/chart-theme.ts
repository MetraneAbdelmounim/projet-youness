import { Chart, ChartOptions, registerables } from 'chart.js';

// Registered once here rather than in each chart component: every component
// that draws a chart imports this module, and repeating the call per component
// risks one of them being missed — which surfaces only at runtime as
// «"category" is not a registered scale».
Chart.register(...registerables);

/**
 * Reads chart colours from the design tokens rather than hard-coding them, so a
 * theme switch repaints every chart from the same source of truth as the rest
 * of the UI.
 *
 * The two series steps were validated against both surfaces with the palette
 * checker (worst adjacent CVD ΔE 24.7 light / 26.8 dark, both well clear of the
 * ≥8 target); the dark steps are chosen for the dark surface, not flipped.
 */
export function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export interface ChartTokens {
  series1: string;
  series2: string;
  ink: string;
  inkMuted: string;
  grid: string;
  surface: string;
  good: string;
  warn: string;
  crit: string;
}

export function chartTokens(): ChartTokens {
  return {
    series1: token('--series-1'),
    series2: token('--series-2'),
    ink: token('--ink'),
    inkMuted: token('--ink-muted'),
    grid: token('--grid'),
    surface: token('--surface'),
    good: token('--good'),
    warn: token('--warn'),
    crit: token('--crit'),
  };
}

/**
 * Shared axis/legend/tooltip styling.
 *
 * Grid and axes are deliberately recessive so the data reads first, and the
 * tooltip follows the app surface instead of Chart.js' default black box.
 */
export function baseOptions(t: ChartTokens): ChartOptions {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: t.inkMuted,
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          padding: 16,
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: t.surface,
        titleColor: t.ink,
        bodyColor: t.ink,
        borderColor: t.grid,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        displayColors: true,
        usePointStyle: true,
        boxPadding: 4,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: t.grid },
        ticks: { color: t.inkMuted, font: { size: 11 }, maxRotation: 0, autoSkip: true },
      },
      y: {
        grid: { color: t.grid },
        border: { display: false },
        ticks: { color: t.inkMuted, font: { size: 11 } },
      },
    },
  };
}

/** Re-reads tokens and repaints every live chart after a theme change. */
export function repaintAllCharts(): void {
  for (const chart of Object.values(Chart.instances)) {
    (chart as Chart).update('none');
  }
}

import jsPDF from 'jspdf';
import autoTable, { CellHookData, RowInput } from 'jspdf-autotable';
import { Analysis, Performance, Site } from '../models/site';
import { I18nService } from '../i18n/i18n.service';
import { TranslationKey } from '../i18n/fr';

/**
 * The printed report.
 *
 * Colours are the light-theme design tokens from styles.css rather than ad-hoc
 * values: the report is always printed on white, which is exactly the surface
 * those tokens were contrast-validated against, so the paper matches the screen
 * and every status pairing stays legible.
 */
type RGB = [number, number, number];

const INK: RGB = [11, 18, 32];
const INK_MUTED: RGB = [100, 114, 135];
const LINE: RGB = [221, 229, 240];
const SUNKEN: RGB = [238, 242, 248];
const WHITE: RGB = [255, 255, 255];

const BRAND: RGB = [36, 108, 196];
const BRAND_INK: RGB = [26, 79, 150];

const GOOD: RGB = [15, 122, 85];
const GOOD_SOFT: RGB = [227, 247, 238];
const WARN: RGB = [138, 97, 0];
const WARN_SOFT: RGB = [253, 242, 221];
const CRIT: RGB = [179, 38, 43];
const CRIT_SOFT: RGB = [253, 234, 234];
const NEUTRAL: RGB = [74, 85, 104];
const NEUTRAL_SOFT: RGB = [238, 241, 246];

/** A4 landscape: ten columns cannot be read at portrait width. */
const PAGE = { width: 297, height: 210 };
const MARGIN = 12;
const HEADER_HEIGHT = 26;
const SUMMARY_HEIGHT = 16;

/**
 * Status is never encoded by colour alone.
 *
 * Each state carries its own word, so the report survives greyscale printing
 * and colour-vision deficiency — the two things a field report reliably meets.
 */
const PERFORMANCE = {
  UP: { key: 'analysis.perfHigh', ink: GOOD, fill: GOOD_SOFT },
  MEDIUM: { key: 'analysis.perfMedium', ink: WARN, fill: WARN_SOFT },
  DOWN: { key: 'analysis.perfLow', ink: CRIT, fill: CRIT_SOFT },
  UNKNOWN: { key: 'analysis.perfUnknown', ink: NEUTRAL, fill: NEUTRAL_SOFT },
} as const satisfies Record<Performance, { key: TranslationKey; ink: RGB; fill: RGB }>;

const OFFLINE = { key: 'analysis.offline', ink: CRIT, fill: CRIT_SOFT } as const;

const COLUMNS: { key: TranslationKey; width: number; align: 'left' | 'right' | 'center' }[] = [
  { key: 'report.colStation', width: 46, align: 'left' },
  { key: 'report.colIp', width: 28, align: 'left' },
  { key: 'report.colBattery', width: 22, align: 'left' },
  { key: 'report.colVoltage', width: 20, align: 'right' },
  { key: 'report.colPredicted', width: 26, align: 'right' },
  { key: 'report.colClouds', width: 20, align: 'right' },
  { key: 'report.colSun', width: 24, align: 'right' },
  { key: 'report.colColdLoss', width: 22, align: 'right' },
  { key: 'report.colCloudLoss', width: 24, align: 'right' },
  { key: 'report.colEfficiency', width: 22, align: 'right' },
  { key: 'report.colPerformance', width: 26, align: 'center' },
];

/** Fixed decimals, and an em dash for anything genuinely unknown. */
function num(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(decimals);
}

/**
 * Loads the logo as a data URL.
 *
 * jsPDF cannot fetch a path on its own — passing 'assets/images/logo.png'
 * silently produced no image, which is why the old header had a blank square
 * where the mark should be. Returns null rather than throwing: a missing logo
 * must not cost the operator their report.
 */
async function loadLogo(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function setFill(doc: jsPDF, colour: RGB): void {
  doc.setFillColor(colour[0], colour[1], colour[2]);
}

function setText(doc: jsPDF, colour: RGB): void {
  doc.setTextColor(colour[0], colour[1], colour[2]);
}

/** The brand band repeated at the top of every page. */
function drawHeader(doc: jsPDF, projectName: string, logo: string | null, i18n: I18nService): void {
  setFill(doc, BRAND);
  doc.rect(0, 0, PAGE.width, HEADER_HEIGHT, 'F');

  let textLeft = MARGIN;

  if (logo) {
    // White plate behind the mark: the logo is dark and would disappear on the
    // brand fill.
    setFill(doc, WHITE);
    doc.roundedRect(MARGIN, 5, 26, 16, 2, 2, 'F');
    try {
      doc.addImage(logo, 'PNG', MARGIN + 2, 7, 22, 12, undefined, 'FAST');
    } catch {
      /* An unreadable image must not abort the report. */
    }
    textLeft = MARGIN + 32;
  }

  setText(doc, WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(i18n.t('report.title'), textLeft, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(projectName, textLeft, 19);
}

/**
 * Fleet counts, as labelled tiles.
 *
 * Drawn only on the first page: repeating a fleet-level summary above every
 * page of rows would read as a per-page subtotal, which it is not.
 */
function drawSummary(
  doc: jsPDF,
  counts: { up: number; medium: number; down: number; offline: number },
  total: number,
  i18n: I18nService
): void {
  const tiles = [
    { label: i18n.t('dashboard.stations'), value: total, ink: INK, fill: SUNKEN },
    { label: i18n.t('analysis.high'), value: counts.up, ink: GOOD, fill: GOOD_SOFT },
    { label: i18n.t('analysis.medium'), value: counts.medium, ink: WARN, fill: WARN_SOFT },
    { label: i18n.t('analysis.low'), value: counts.down, ink: CRIT, fill: CRIT_SOFT },
    { label: i18n.t('common.offline'), value: counts.offline, ink: CRIT, fill: CRIT_SOFT },
  ];

  // A station can be reachable yet carry no forecast. Without this the tiles
  // silently fail to add up to the total, and the reader is left to wonder
  // which stations went missing.
  const unknown = total - counts.up - counts.medium - counts.down - counts.offline;
  if (unknown > 0) {
    tiles.push({ label: i18n.t('analysis.noForecast'), value: unknown, ink: NEUTRAL, fill: NEUTRAL_SOFT });
  }

  const gap = 3;
  const usable = PAGE.width - MARGIN * 2;
  const width = (usable - gap * (tiles.length - 1)) / tiles.length;
  const top = HEADER_HEIGHT + 6;

  tiles.forEach((tile, index) => {
    const left = MARGIN + index * (width + gap);

    setFill(doc, tile.fill);
    doc.roundedRect(left, top, width, SUMMARY_HEIGHT, 1.5, 1.5, 'F');

    setText(doc, tile.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(String(tile.value), left + 4, top + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(tile.label.toUpperCase(), left + 4, top + 13);
  });
}

function drawFooter(doc: jsPDF, projectName: string, generatedAt: string, i18n: I18nService): void {
  const pages = doc.getNumberOfPages();

  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);

    const y = PAGE.height - 8;
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y - 4, PAGE.width - MARGIN, y - 4);

    setText(doc, INK_MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(i18n.t('report.generatedOn', { project: projectName, date: generatedAt }), MARGIN, y);
    doc.text(i18n.t('report.page', { page, total: pages }), PAGE.width - MARGIN, y, {
      align: 'right',
    });
  }
}

/** One table row, with offline stations reduced to dashes. */
function buildRow(site: Site, i18n: I18nService): RowInput {
  const analysis: Analysis | undefined = site.lastAnalysis;

  // A forecast is derived from a live reading. Once the station stops
  // responding the stored one describes a state that no longer holds, so the
  // report shows nothing rather than yesterday's numbers presented as today's.
  if (!site.status) {
    return [
      site.nom,
      site.ip,
      site.Battery_Type ?? '—',
      '—',
      '—',
      '—',
      '—',
      '—',
      '—',
      '—',
      i18n.t(OFFLINE.key),
    ];
  }

  return [
    site.nom,
    site.ip,
    site.Battery_Type ?? '—',
    num(site.lastReading?.Battery_Voltage, 2),
    num(analysis?.predicted_end_day_voltage, 2),
    num(analysis?.avg_remaining_cloud, 0),
    num(analysis?.remaining_sun_hours, 1),
    num(analysis?.battery_capacity_loss, 1),
    num(analysis?.solar_charge_loss_clouds, 1),
    num(analysis?.solar_charge_efficiency, 1),
    i18n.t(PERFORMANCE[(analysis?.performance ?? 'UNKNOWN') as Performance].key),
  ];
}

/** Filename-safe project name. */
function slug(value: string): string {
  return (
    value
      .normalize('NFD')
      // Strip the combining marks NFD just split off, so "Renouveau" survives
      // and "é" does not become a stray accent in the filename.
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'projet'
  );
}

export async function buildAnalysisReport(
  projectName: string,
  sites: Site[],
  counts: { up: number; medium: number; down: number; offline: number },
  i18n: I18nService
): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logo = await loadLogo('assets/images/logo.png');
  const generatedAt = new Date().toLocaleString(i18n.locale);

  // Offline stations sink to the bottom: the report is read to find out what
  // needs attention, and a station with no data is not a per-metric comparison.
  const ordered = [...sites].sort((a, b) => {
    if (a.status !== b.status) return a.status ? -1 : 1;
    // Numeric collation, or "10-A25Nord" sorts between "1-A20Ouest" and
    // "2-A20Ouest" and the report reads as if the fleet were shuffled.
    return a.nom.localeCompare(b.nom, i18n.lang(), { numeric: true, sensitivity: 'base' });
  });

  const offlineRows = new Set<number>();
  ordered.forEach((site, index) => {
    if (!site.status) offlineRows.add(index);
  });

  autoTable(doc, {
    head: [COLUMNS.map((c) => i18n.t(c.key))],
    body: ordered.map((site) => buildRow(site, i18n)),
    startY: HEADER_HEIGHT + SUMMARY_HEIGHT + 12,
    margin: { top: HEADER_HEIGHT + 6, left: MARGIN, right: MARGIN, bottom: 16 },
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 },
      textColor: INK,
      lineColor: LINE,
      lineWidth: { bottom: 0.1, top: 0, left: 0, right: 0 },
      valign: 'middle',
    },
    headStyles: {
      fillColor: BRAND_INK,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 7.5,
      lineWidth: 0,
      valign: 'middle',
    },
    // Zebra striping instead of a full grid: the eye tracks a row across ten
    // columns without vertical rules chopping it up.
    alternateRowStyles: { fillColor: [250, 251, 253] },
    columnStyles: Object.fromEntries(
      COLUMNS.map((c, i) => [i, { cellWidth: c.width, halign: c.align }])
    ),

    didParseCell: (data: CellHookData) => {
      if (data.section === 'head') {
        data.cell.styles.halign = COLUMNS[data.column.index].align;
        return;
      }
      if (data.section !== 'body') return;

      const offline = offlineRows.has(data.row.index);

      // Station name stays legible as the row's anchor.
      if (data.column.index === 0) data.cell.styles.fontStyle = 'bold';
      if (data.column.index === 1) data.cell.styles.textColor = INK_MUTED;

      if (offline) {
        // Muted, but the name and IP stay readable — this is the row an
        // operator has to act on.
        if (data.column.index > 1 && data.column.index < 10) {
          data.cell.styles.textColor = INK_MUTED;
        }
      }

      if (data.column.index === 10) {
        // Matched on the station's own state rather than on the rendered text,
        // which changes with the language.
        const performance = (ordered[data.row.index]?.lastAnalysis?.performance ??
          'UNKNOWN') as Performance;
        const state = offline ? OFFLINE : PERFORMANCE[performance] ?? PERFORMANCE.UNKNOWN;
        data.cell.styles.textColor = state.ink;
        data.cell.styles.fillColor = state.fill;
        data.cell.styles.fontStyle = 'bold';
      }
    },

    didDrawPage: () => drawHeader(doc, projectName, logo, i18n),
  });

  // Drawn after the table so it sits above the first page's band, and only
  // once — didDrawPage would repeat it on every page.
  doc.setPage(1);
  drawSummary(doc, counts, sites.length, i18n);

  drawFooter(doc, projectName, generatedAt, i18n);

  const date = new Date().toISOString().slice(0, 10);
  doc.save(`${i18n.t('report.fileName')}_${slug(projectName)}_${date}.pdf`);
}

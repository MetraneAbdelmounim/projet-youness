/**
 * HTML for outgoing mail.
 *
 * Mail clients are not browsers. Outlook renders through Word, Gmail strips
 * <style> blocks, and neither supports flexbox, grid or CSS variables. So the
 * layout is built from nested tables with inline styles only — the dullest
 * technique available, and the only one that survives everywhere.
 *
 * Colours are the light-theme design tokens the rest of the product uses, so a
 * message looks like the screen it came from. They are written out literally:
 * a custom property would resolve to nothing in most clients.
 */

const INK = '#0b1220';
const INK_MUTED = '#647287';
const LINE = '#dde5f0';
const SUNKEN = '#eef2f8';
const SURFACE = '#ffffff';
const PAGE = '#f4f7fb';

const NAVY = '#14385f';

/** Each tone pairs an ink with its own tint; both are legible on white. */
const TONES = {
  good: { ink: '#0f7a55', soft: '#e3f7ee' },
  warn: { ink: '#8a6100', soft: '#fdf2dd' },
  crit: { ink: '#b3262b', soft: '#fdeaea' },
  neutral: { ink: '#4a5568', soft: '#eef1f6' },
};

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

/** A cell is a plain string, or `{ text, tone }` to colour it. */
function cellOf(cell) {
  if (cell && typeof cell === 'object' && 'text' in cell) {
    return { text: String(cell.text ?? ''), tone: TONES[cell.tone] || null };
  }
  return { text: String(cell ?? ''), tone: null };
}

/**
 * Data table.
 *
 * Zebra striping and a single rule under each row, rather than the boxed grid
 * `border="1"` draws: with six columns the vertical rules chopped every row
 * into fragments and the eye lost the line it was reading.
 */
function table(headers, rows, options = {}) {
  const align = options.align || [];
  const cellAlign = (i) => (align[i] === 'right' ? 'right' : 'left');

  const head = headers
    .map(
      (h, i) =>
        `<th align="${cellAlign(i)}" style="padding:10px 12px;font:600 11px ${FONT};` +
        `letter-spacing:.4px;text-transform:uppercase;color:#ffffff;background:${NAVY};">` +
        `${escapeHtml(h)}</th>`
    )
    .join('');

  const body = rows
    .map((row, index) => {
      const stripe = index % 2 ? SUNKEN : SURFACE;
      const cells = row
        .map((raw, i) => {
          const { text, tone } = cellOf(raw);
          const colour = tone ? tone.ink : INK;
          const weight = tone ? 600 : 400;
          const bg = tone ? tone.soft : stripe;
          return (
            `<td align="${cellAlign(i)}" style="padding:10px 12px;font:${weight} 13px ${FONT};` +
            `color:${colour};background:${bg};border-bottom:1px solid ${LINE};">` +
            `${escapeHtml(text)}</td>`
          );
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" ` +
    `style="border-collapse:collapse;width:100%;border:1px solid ${LINE};border-radius:8px;` +
    `overflow:hidden;">` +
    `<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
  );
}

/** A count with a label, for the strip under the title. */
function stat(value, label, tone = 'neutral') {
  const t = TONES[tone] || TONES.neutral;
  return (
    `<td align="center" style="padding:10px 6px;background:${t.soft};border-radius:6px;">` +
    `<div style="font:700 20px ${FONT};color:${t.ink};line-height:1.1;">${escapeHtml(value)}</div>` +
    `<div style="font:600 10px ${FONT};letter-spacing:.3px;text-transform:uppercase;` +
    `color:${t.ink};padding-top:3px;">${escapeHtml(label)}</div></td>`
  );
}

/** Lays stat cells side by side with a gap between them. */
function statRow(cells) {
  const spaced = cells.join('<td style="width:8px;font-size:0;line-height:0;">&nbsp;</td>');
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" ` +
    `style="border-collapse:separate;width:100%;"><tr>${spaced}</tr></table>`
  );
}

/**
 * Wraps content in the branded shell.
 *
 * `preheader` is the line inboxes show beside the subject. Left unset, clients
 * pull the first words of the body instead — which here would be a colour code
 * or a stray emoji.
 */
function layout({ title, subtitle, preheader, accent = 'neutral', body, footer }) {
  const tone = TONES[accent] || TONES.neutral;

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light"/>
<title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${PAGE};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader || subtitle || title)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PAGE};">
<tr><td align="center" style="padding:24px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"
       style="width:600px;max-width:100%;background:${SURFACE};border:1px solid ${LINE};border-radius:12px;overflow:hidden;">

  <tr><td style="height:4px;background:${tone.ink};font-size:0;line-height:0;">&nbsp;</td></tr>

  <tr><td style="padding:20px 24px 0;">
    <div style="font:700 13px ${FONT};color:${NAVY};letter-spacing:.3px;">InfraPulse</div>
    <div style="font:400 11px ${FONT};color:${INK_MUTED};padding-top:2px;">Supervision des stations</div>
  </td></tr>

  <tr><td style="padding:14px 24px 0;">
    <div style="font:700 20px ${FONT};color:${INK};line-height:1.3;">${escapeHtml(title)}</div>
    ${subtitle ? `<div style="font:400 13px ${FONT};color:${INK_MUTED};padding-top:4px;line-height:1.5;">${escapeHtml(subtitle)}</div>` : ''}
  </td></tr>

  <tr><td style="padding:18px 24px 22px;">${body}</td></tr>

  <tr><td style="padding:14px 24px 20px;border-top:1px solid ${LINE};background:${SUNKEN};">
    <div style="font:400 11px ${FONT};color:${INK_MUTED};line-height:1.6;">${footer || ''}</div>
  </td></tr>

</table>

<div style="font:400 11px ${FONT};color:${INK_MUTED};padding-top:14px;">
  Message automatique — merci de ne pas y répondre.
</div>

</td></tr></table>
</body></html>`;
}

module.exports = { layout, table, stat, statRow, escapeHtml, TONES };

const config = require('../config/config');
const settings = require('../config/setting');
const Site = require('../site/site');
const Panneau = require('../panneau/panneau');
const Member = require('../member/member');
const AlertState = require('../analysis/alertState');
const mailer = require('./mailer');

/**
 * Reason codes.
 *
 * These exact strings are persisted in AlertState and compared on every sweep
 * to decide whether an alert is new. Changing a value would make every open
 * alert look new and re-notify the whole fleet once, so they stay as they are
 * and the French wording lives in a separate display map.
 */
const REASON_DOWN = 'Station is DOWN (no ping response)';
const REASON_STALE = 'No recent MPPT reading';
const REASON_LOW = 'Low predicted voltage';
const REASON_PANNEAU_DOWN = 'Panneau is DOWN (no ping response)';

const REASON_LABELS = {
  [REASON_DOWN]: 'Injoignable',
  [REASON_STALE]: 'Aucun relevé récent',
  [REASON_LOW]: 'Tension prévue faible',
  [REASON_PANNEAU_DOWN]: 'Injoignable',
};

/**
 * Rows shown in the digest before it is truncated.
 *
 * A fleet-wide outage otherwise produces a message hundreds of rows long that
 * nobody scrolls; the counts at the top already carry the scale, and the
 * platform holds the full list.
 */
const MAX_ROWS = 15;

const REASON_TONES = {
  [REASON_DOWN]: 'crit',
  [REASON_STALE]: 'warn',
  [REASON_LOW]: 'warn',
  [REASON_PANNEAU_DOWN]: 'crit',
};

/**
 * Whether an alert is due to be emailed now.
 *
 * Due when it is new, when the reason has changed, or when the reminder
 * interval has elapsed. State lives in Mongo so a restart no longer re-notifies
 * everyone, and site/panneau alerts on the same IP stay distinct.
 *
 * This only *reads*. Recording the notification is deliberately a separate
 * step: writing it here marked an alert as "already sent" even when no mail
 * ever left the process, suppressing it for a full reminder interval.
 */
async function isDue(kind, ip, reason, reminderIntervalMs) {
  const existing = await AlertState.findOne({ kind, ip }).lean();
  if (!existing) return true;
  if (existing.reason !== reason) return true;
  return Date.now() - new Date(existing.lastNotifiedAt).getTime() > reminderIntervalMs;
}

/** Called only once a digest containing this alert has actually been accepted. */
async function recordNotified(kind, ip, reason) {
  await AlertState.updateOne(
    { kind, ip },
    { $set: { reason, lastNotifiedAt: new Date() } },
    { upsert: true }
  );
}

async function clearAlert(kind, ip) {
  await AlertState.deleteOne({ kind, ip });
}

/**
 * Notifiable members and the projects each may be told about.
 *
 * `projects: null` means "every project". Admins are unrestricted everywhere
 * else in the app (see `accessibleProjectIds` in middlewares/auth.js), and an
 * admin carrying no explicit project list is the normal case — treating them as
 * assigned to nothing meant every alert matched no recipient and was dropped.
 */
async function recipientsByProject() {
  // An address stored on the member, not derived from their username: the two
  // are independent, and deriving one from the other meant a change of login
  // name or of mail domain silently pointed every alert at a dead mailbox.
  const members = await Member.find({ notification: true, email: { $ne: '' } })
    .select('email isAdmin projects')
    .lean();

  return members.map((m) => ({
    email: m.email,
    projects: m.isAdmin ? null : new Set((m.projects || []).map((p) => p.toString())),
  }));
}

/**
 * Why a station should raise an alert, or null when it is healthy.
 *
 * Device state is read from the store the poller maintains rather than probed
 * here — the sweep used to make one HTTP call and one ICMP probe per station
 * inline, so a large project could not finish within its own schedule interval.
 */
function siteReason(site, staleBefore) {
  if (!site.status) return REASON_DOWN;

  if (
    !site.lastReading?.measuredAt ||
    new Date(site.lastReading.measuredAt).getTime() < staleBefore
  ) {
    return REASON_STALE;
  }

  if (site.lastAnalysis?.performance === 'DOWN') return REASON_LOW;

  return null;
}

/** Evaluates every station and panneau and emails a per-recipient digest. */
async function runAlertSweep() {
  console.log('⏱️  Running MPPT performance check...');

  // Read once per sweep: an operator may have changed these since boot.
  const current = await settings.all();

  const [sites, panneaux] = await Promise.all([
    Site.find().populate('project').lean(),
    Panneau.find().populate('project').lean(),
  ]);

  // Consider telemetry stale if the poller has not refreshed it in three cycles.
  const staleBefore = Date.now() - 3 * config.pollIntervalSeconds * 1000;

  // Detection is kept separate from delivery so the two failure modes stay
  // distinguishable: "nothing is wrong" and "something is wrong but nobody was
  // told" used to print the same reassuring line.
  const issues = [];

  for (const site of sites) {
    const reason = siteReason(site, staleBefore);
    if (!reason) {
      await clearAlert('Site', site.ip);
      continue;
    }
    issues.push({
      kind: 'Site',
      nom: site.nom,
      ip: site.ip,
      reason,
      projectId: site.project?._id?.toString() || null,
      project: site.project?.nom || 'N/A',
    });
  }

  for (const panneau of panneaux) {
    if (panneau.status) {
      await clearAlert('Panneau', panneau.ip);
      continue;
    }
    issues.push({
      kind: 'Panneau',
      nom: panneau.nom,
      ip: panneau.ip,
      reason: REASON_PANNEAU_DOWN,
      projectId: panneau.project?._id?.toString() || null,
      project: panneau.project?.nom || 'N/A',
    });
  }

  if (!issues.length) {
    console.log('✅ No issues detected. No alerts to send.');
    return;
  }

  const due = [];
  for (const issue of issues) {
    if (await isDue(issue.kind, issue.ip, issue.reason, current['alert.reminderIntervalMs'])) {
      due.push(issue);
    }
  }

  console.log(
    `⚠️  ${issues.length} issue(s) detected; ${due.length} due for notification ` +
      `(${issues.length - due.length} already notified within the reminder interval).`
  );
  if (!due.length) return;

  const recipients = await recipientsByProject();
  if (!recipients.length) {
    console.warn(
      `🔕 ${due.length} alert(s) raised but no member has notifications enabled. ` +
        'Enable "notification" on at least one member in Administration.'
    );
    return;
  }

  const alertsByEmail = new Map();
  for (const issue of due) {
    for (const { email, projects } of recipients) {
      // A null project set means unrestricted; otherwise the alert's project
      // must be one the member is assigned to.
      if (projects && (!issue.projectId || !projects.has(issue.projectId))) continue;
      if (!alertsByEmail.has(email)) alertsByEmail.set(email, []);
      alertsByEmail.get(email).push(issue);
    }
  }

  if (!alertsByEmail.size) {
    console.warn(
      `🔕 ${due.length} alert(s) raised but none matched a recipient. ` +
        'Check that notification members are assigned to the affected projects.'
    );
    return;
  }

  const now = new Date().toLocaleString('fr-CA', { timeZone: current['schedule.timezone'] });
  const delivered = new Set();

  await Promise.all(
    [...alertsByEmail].map(async ([email, alerts]) => {
      const projects = [...new Set(alerts.map((a) => a.project))].join(', ');
      const down = alerts.filter((a) => a.reason === REASON_DOWN).length;
      const stale = alerts.filter((a) => a.reason === REASON_STALE).length;
      const weak = alerts.filter((a) => a.reason === REASON_LOW).length;

      // Counts first: an operator opening this on a phone needs the scale of
      // the problem before the detail of it.
      const summary = mailer.statRow(
        [
          mailer.stat(alerts.length, 'Alertes', 'crit'),
          down ? mailer.stat(down, 'Injoignables', 'crit') : null,
          stale ? mailer.stat(stale, 'Sans relevé', 'warn') : null,
          weak ? mailer.stat(weak, 'Tension faible', 'warn') : null,
        ].filter(Boolean)
      );

      const sent = await mailer.send({
        to: email,
        subject: `InfraPulse — ${alerts.length} alerte(s) · ${projects}`,
        html: mailer.layout({
          accent: 'crit',
          title: `${alerts.length} équipement(s) à vérifier`,
          subtitle: projects,
          preheader: `${down} injoignable(s), ${stale} sans relevé récent, ${weak} sous tension faible.`,
          body:
            summary +
            '<div style="height:16px;font-size:0;line-height:0;">&nbsp;</div>' +
            mailer.table(
              ['Équipement', 'Adresse IP', 'Projet', 'État'],
              alerts.slice(0, MAX_ROWS).map((a) => [
                `${a.nom} · ${a.kind === 'Panneau' ? 'Panneau' : 'Station'}`,
                a.ip,
                a.project,
                { text: REASON_LABELS[a.reason] || a.reason, tone: REASON_TONES[a.reason] || 'crit' },
              ])
            ) +
            (alerts.length > MAX_ROWS
              ? `<div style="padding:12px 2px 0;font:400 12px -apple-system,BlinkMacSystemFont,` +
                `'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#647287;">` +
                `… et ${alerts.length - MAX_ROWS} autre(s) équipement(s). ` +
                `La liste complète est dans la plateforme.</div>`
              : ''),
          footer: `Relevé du ${now}. Une alerte non résolue est rappelée automatiquement.`,
        }),
      });

      if (sent) alerts.forEach((a) => delivered.add(a));
    })
  );

  // Suppression is only justified once the operator has actually been told.
  await Promise.all([...delivered].map((a) => recordNotified(a.kind, a.ip, a.reason)));

  if (delivered.size < due.length) {
    console.warn(
      `📧 ${delivered.size}/${due.length} alert(s) delivered — the rest will be retried next sweep.`
    );
  } else {
    console.log(`📧 ${delivered.size} alert(s) delivered.`);
  }
}

module.exports = { runAlertSweep };

const config = require('../config/config');
const Site = require('../site/site');
const Panneau = require('../panneau/panneau');
const Member = require('../member/member');
const AlertState = require('../analysis/alertState');
const mailer = require('./mailer');

/**
 * Decides whether an alert should be emailed now.
 *
 * An alert is sent when it is new, when the reason has changed, or when the
 * reminder interval has elapsed. State lives in Mongo so a restart no longer
 * re-notifies everyone, and site/panneau alerts on the same IP stay distinct.
 */
async function shouldNotify(kind, ip, reason) {
  const existing = await AlertState.findOne({ kind, ip }).lean();
  const stale =
    existing && Date.now() - new Date(existing.lastNotifiedAt).getTime() > config.reminderIntervalMs;

  if (existing && existing.reason === reason && !stale) return false;

  await AlertState.updateOne(
    { kind, ip },
    { $set: { reason, lastNotifiedAt: new Date() } },
    { upsert: true }
  );
  return true;
}

async function clearAlert(kind, ip) {
  await AlertState.deleteOne({ kind, ip });
}

/** Maps each notifiable member's email to the set of projects they can see. */
async function recipientsByProject() {
  const members = await Member.find({ notification: true }).select('username projects').lean();
  return members.map((m) => ({
    email: `${m.username}@${config.memberEmailDomain}`,
    projects: new Set((m.projects || []).map((p) => p.toString())),
  }));
}

/**
 * Evaluates every station and panneau and emails a per-recipient digest.
 *
 * Device state is read from the store the poller maintains rather than probed
 * here — the sweep used to make one HTTP call and one ICMP probe per station
 * inline, so a large project could not finish within its own schedule interval.
 */
async function runAlertSweep() {
  console.log('⏱️  Running MPPT performance check...');

  const recipients = await recipientsByProject();
  const alertsByEmail = new Map();

  const addAlert = (projectId, alert) => {
    for (const { email, projects } of recipients) {
      if (!projectId || !projects.has(projectId.toString())) continue;
      if (!alertsByEmail.has(email)) alertsByEmail.set(email, []);
      alertsByEmail.get(email).push(alert);
    }
  };

  const [sites, panneaux] = await Promise.all([
    Site.find().populate('project').lean(),
    Panneau.find().populate('project').lean(),
  ]);

  // Consider telemetry stale if the poller has not refreshed it in three cycles.
  const staleBefore = Date.now() - 3 * (Number(process.env.POLL_INTERVAL_SECONDS) || 300) * 1000;

  for (const site of sites) {
    let reason = null;

    if (!site.status) {
      reason = 'Station is DOWN (no ping response)';
    } else if (
      !site.lastReading?.measuredAt ||
      new Date(site.lastReading.measuredAt).getTime() < staleBefore
    ) {
      reason = 'No recent MPPT reading';
    } else if (site.lastAnalysis?.performance === 'DOWN') {
      reason = 'Low predicted voltage';
    }

    if (reason) {
      if (await shouldNotify('Site', site.ip, reason)) {
        addAlert(site.project?._id, {
          nom: site.nom,
          ip: site.ip,
          project: site.project?.nom || 'N/A',
          reason,
          type: 'Site',
        });
      }
    } else {
      await clearAlert('Site', site.ip);
    }
  }

  for (const panneau of panneaux) {
    if (!panneau.status) {
      const reason = 'Panneau is DOWN (no ping response)';
      if (await shouldNotify('Panneau', panneau.ip, reason)) {
        addAlert(panneau.project?._id, {
          nom: panneau.nom,
          ip: panneau.ip,
          project: panneau.project?.nom || 'N/A',
          reason,
          type: 'Panneau',
        });
      }
    } else {
      await clearAlert('Panneau', panneau.ip);
    }
  }

  if (!alertsByEmail.size) {
    console.log('✅ No issues detected. No alerts to send.');
    return;
  }

  const now = new Date().toLocaleString('fr-CA', { timeZone: config.timezone });

  await Promise.all(
    [...alertsByEmail].map(([email, alerts]) => {
      const projects = [...new Set(alerts.map((a) => a.project))].join(', ');
      return mailer.send({
        to: email,
        subject: `[MI8 Monitoring Platform][${projects}] MPPT Alert Summary`,
        html:
          '<h3>🚨 MPPT &amp; Panneaux Status Report</h3>' +
          mailer.table(
            ['Type', 'Name', 'IP', 'Project', 'Status', 'Date'],
            alerts.map((a) => [
              a.type === 'Panneau' ? 'Panneau de parcours' : 'Station MPPT',
              a.nom,
              a.ip,
              a.project,
              a.reason,
              now,
            ])
          ),
      });
    })
  );
}

module.exports = { runAlertSweep };

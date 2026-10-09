const axios = require('axios').default;
const config = require('../config/config');
const Site = require('../site/site');
const Member = require('../member/member');
const settings = require('../config/setting');
const mailer = require('./mailer');

const PY_BASE = `http://${config.HOST_PY}:${config.PORT_PY}`;
const RESTART_TIMEOUT_MS = 20000;
const RESTART_CONCURRENCY = 5;

/** Runs `worker` over `items` with a bounded number in flight. */
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await worker(items[index]);
      }
    })
  );

  return results;
}

/**
 * Restarts every station and mails admins a report.
 *
 * Runs on its own midnight expression. It previously shared the alert
 * schedule, so with the toggle enabled in production it fired every fifteen
 * minutes and reset every station each time.
 */
async function runNightlyRestart() {
  if (!(await settings.get('reloadMidnight'))) return;

  console.log('🌙 [MIDNIGHT] Starting restart for all stations...');

  const admins = await Member.find({ isAdmin: true, notification: true, email: { $ne: '' } })
    .select('email')
    .lean();
  if (!admins.length) {
    console.log('ℹ️  No admins to notify.');
    return;
  }

  const sites = await Site.find().populate('project').lean();

  const results = await mapWithConcurrency(sites, RESTART_CONCURRENCY, async (site) => {
    let restart = '✅ Success';
    try {
      await axios.post(`${PY_BASE}/control/reload/${site.ip}`, {}, { timeout: RESTART_TIMEOUT_MS });
    } catch {
      restart = "❌ Can't access the station";
    }
    return {
      name: site.nom,
      ip: site.ip,
      project: site.project?.nom || 'N/A',
      restart,
    };
  });

  const current = await settings.all();
  const now = new Date().toLocaleString('fr-CA', { timeZone: current['schedule.timezone'] });

  // "OK" is whatever the restart helper reports as success; anything else is
  // worth an operator's eye, so it is toned rather than left as plain text.
  const succeeded = results.filter((r) => /ok|succ/i.test(String(r.restart))).length;
  const failed = results.length - succeeded;

  await mailer.send({
    to: admins.map((a) => a.email),
    subject: `InfraPulse — Redémarrage nocturne · ${succeeded}/${results.length} réussi(s)`,
    html: mailer.layout({
      accent: failed ? 'warn' : 'good',
      title: 'Rapport de redémarrage nocturne',
      subtitle: `${results.length} station(s) traitée(s).`,
      preheader: `${succeeded} réussite(s), ${failed} échec(s).`,
      body:
        mailer.statRow([
          mailer.stat(results.length, 'Stations', 'neutral'),
          mailer.stat(succeeded, 'Réussis', 'good'),
          mailer.stat(failed, 'Échecs', failed ? 'crit' : 'neutral'),
        ]) +
        '<div style="height:16px;font-size:0;line-height:0;">&nbsp;</div>' +
        mailer.table(
          ['Station', 'Adresse IP', 'Projet', 'Redémarrage'],
          results.map((r) => [
            r.name,
            r.ip,
            r.project,
            {
              text: r.restart,
              tone: /ok|succ/i.test(String(r.restart)) ? 'good' : 'crit',
            },
          ])
        ),
      footer: `Exécuté le ${now}.`,
    }),
  });

  console.log('✅ Restart report sent to admins.');
}

module.exports = { runNightlyRestart };

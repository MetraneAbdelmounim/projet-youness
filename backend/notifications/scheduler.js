const cron = require('node-cron');
const settings = require('../config/setting');
const { runAlertSweep } = require('./alertJob');
const { runNightlyRestart } = require('./nightlyJob');

/**
 * Wraps a job so overlapping runs are skipped and a failure never takes the
 * process down — an unhandled rejection inside a cron callback previously had
 * nothing to catch it.
 */
function guard(name, job) {
  let running = false;
  return async () => {
    if (running) {
      console.warn(`⏭️  ${name} is still running — skipping this tick.`);
      return;
    }
    running = true;
    try {
      await job();
    } catch (err) {
      console.error(`❌ ${name} failed:`, err.message);
    } finally {
      running = false;
    }
  };
}

const JOBS = [
  { name: 'alert sweep', key: 'schedule.alert', run: guard('alert sweep', runAlertSweep) },
  {
    name: 'nightly restart',
    key: 'schedule.nightly',
    run: guard('nightly restart', runNightlyRestart),
  },
];

let tasks = [];

async function apply() {
  // Cron expressions are fixed at schedule time, so a change means tearing the
  // old tasks down rather than mutating them.
  tasks.forEach((t) => t.stop());
  tasks = [];

  const current = await settings.all();
  const timezone = current['schedule.timezone'];

  for (const job of JOBS) {
    tasks.push(cron.schedule(current[job.key], job.run, { timezone }));
  }

  console.log(
    `🕒 Scheduled: alerts "${current['schedule.alert']}", ` +
      `nightly restart "${current['schedule.nightly']}" (${timezone})`
  );
}

async function start() {
  await apply();

  settings.events.on('changed', (keys) => {
    if (!keys.some((k) => k.startsWith('schedule.'))) return;
    apply().catch((err) => console.error('❌ Failed to reschedule jobs:', err.message));
  });
}

module.exports = { start, apply };

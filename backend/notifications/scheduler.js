const cron = require('node-cron');
const config = require('../config/config');
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

function start() {
  cron.schedule(config.schedule, guard('alert sweep', runAlertSweep), {
    timezone: config.timezone,
  });

  cron.schedule(config.nightlySchedule, guard('nightly restart', runNightlyRestart), {
    timezone: config.timezone,
  });

  console.log(
    `🕒 Scheduled: alerts "${config.schedule}", nightly restart "${config.nightlySchedule}" (${config.timezone})`
  );
}

module.exports = { start };

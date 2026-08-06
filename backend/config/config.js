require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Reads a required environment variable.
 * In production a missing value is fatal — we refuse to boot with a default
 * secret rather than silently accepting forgeable tokens.
 */
function required(name, devFallback) {
  const value = process.env[name];
  if (value) return value;
  if (isProduction) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
      `See backend/.env.example.`
    );
  }
  console.warn(`⚠️  ${name} is not set — using a development-only fallback.`);
  return devFallback;
}

function list(name, fallback = []) {
  const value = process.env[name];
  if (!value) return fallback;
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

function bool(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

module.exports = {
  isProduction,

  HOST: process.env.HOST || '127.0.0.1',
  PORT: Number(process.env.PORT) || 5000,

  bdUrl: process.env.MONGO_URL ||
    (isProduction ? 'mongodb://mongo:27017/mppt' : 'mongodb://127.0.0.1:27017/mppt'),

  // Rotate this. The previous value was a public example token committed to git.
  secret_token_key: required('JWT_SECRET', 'dev-only-insecure-secret-change-me'),
  /**
   * Session lifetime. 590h (~24.6 days) is a deliberate product decision: field
   * operators should not be forced to re-authenticate during a deployment.
   *
   * Note the ceiling — the client schedules its auto-logout with setTimeout,
   * which saturates at 2^31-1 ms (~24.86 days). 590h fits with about 6 hours to
   * spare; beyond ~596h the timer would fire immediately, so the client clamps
   * it defensively.
   */
  token_expiration: process.env.JWT_EXPIRATION || '590h',

  // Python polling service
  PORT_PY: Number(process.env.PORT_PY) || 8000,
  HOST_PY: process.env.HOST_PY || (isProduction ? 'flask-service' : '127.0.0.1'),

  DATE_Licence: new Date(process.env.LICENCE_EXPIRY || '2026-09-01'),

  // Origins allowed to call the API. Same-origin deployments need none.
  corsOrigins: list('CORS_ORIGINS', isProduction ? [] : ['http://localhost:4200']),

  mailOptions: {
    from: process.env.MAIL_FROM || 'notifications@innovationmi8.com',
    to: list('MAIL_TO'),
  },

  transporter: {
    host: process.env.SMTP_HOST || 'innovationmi8-com.mail.protection.outlook.com',
    port: Number(process.env.SMTP_PORT) || 25,
    // Rotate the previous credentials — they were committed to git.
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: required('SMTP_PASS') }
      : null,
  },

  // Email domain used to derive member addresses from usernames.
  memberEmailDomain: process.env.MEMBER_EMAIL_DOMAIN || 'innovationmi8.com',

  /**
   * Who publishes and licenses this software — you, not the customer running it.
   *
   * Served to the client so the licence screen can say who to contact for a
   * renewal. Left null until set, in which case the UI says "votre fournisseur"
   * rather than naming the wrong party: the customer must never be told to
   * contact themselves.
   */
  vendorName: process.env.VENDOR_NAME || null,

  // Alert sweep cadence.
  schedule: process.env.ALERT_SCHEDULE || (isProduction ? '*/15 * * * *' : '*/5 * * * *'),
  // Nightly restart sweep — a real midnight expression, not the alert cadence.
  nightlySchedule: process.env.NIGHTLY_SCHEDULE || '0 0 * * *',
  timezone: process.env.TZ || 'America/Montreal',

  // Repeat an unresolved alert at most this often.
  reminderIntervalMs: Number(process.env.REMINDER_INTERVAL_MS) || 12 * 60 * 60 * 1000,

  // Default for the nightly restart toggle on a fresh database.
  reloadMidnightDefault: bool('RELOAD_MIDNIGHT_DEFAULT', false),

  // Maximum accepted spreadsheet upload size.
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES) || 5 * 1024 * 1024,
};

const { EventEmitter } = require('events');
const cron = require('node-cron');
const mongoose = require('mongoose');
const config = require('./config');

/**
 * Runtime settings that operators can change from the UI.
 *
 * These used to be mutated on the `config` module object, which meant a change
 * was lost on restart and never reached a second process. A single document
 * per key keeps every instance in agreement.
 */
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

const Setting = mongoose.model('Setting', settingSchema);

/** Emits 'changed' with the list of keys whenever settings are written. */
const events = new EventEmitter();

const HOUR_MS = 60 * 60 * 1000;

function requireNonEmpty(label) {
  return (v) => {
    if (typeof v !== 'string' || !v.trim()) throw new Error(`${label} est obligatoire.`);
    return v.trim();
  };
}

function requireCron(label) {
  return (v) => {
    const expression = String(v ?? '').trim();
    if (!cron.validate(expression)) {
      throw new Error(`${label} n'est pas une expression cron valide (ex. "*/15 * * * *").`);
    }
    return expression;
  };
}

/**
 * Every operator-editable setting, with its default taken from the environment.
 *
 * The .env file therefore remains the source of truth for a fresh install: a
 * key absent from the database falls back to it, and "reset" simply deletes the
 * row rather than writing the current env value into the database — so editing
 * .env still takes effect for anything never overridden in the UI.
 */
const REGISTRY = {
  'smtp.host': {
    group: 'smtp',
    default: () => config.transporter.host,
    coerce: requireNonEmpty('Le serveur SMTP'),
  },
  'smtp.port': {
    group: 'smtp',
    default: () => config.transporter.port,
    coerce: (v) => {
      const port = Number(v);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('Le port SMTP doit être un entier entre 1 et 65535.');
      }
      return port;
    },
  },
  'smtp.secure': {
    group: 'smtp',
    // Implicit TLS is the norm on 465; everything else upgrades with STARTTLS.
    default: () => config.transporter.port === 465,
    coerce: (v) => v === true || v === 'true',
  },
  'smtp.user': {
    group: 'smtp',
    default: () => config.transporter.auth?.user || '',
    coerce: (v) => String(v ?? '').trim(),
  },
  'smtp.pass': {
    group: 'smtp',
    secret: true,
    default: () => config.transporter.auth?.pass || '',
    coerce: (v) => String(v ?? ''),
  },
  'mail.from': {
    group: 'smtp',
    default: () => config.mailOptions.from,
    coerce: requireNonEmpty("L'adresse d'expéditeur"),
  },
  'mail.memberDomain': {
    group: 'smtp',
    default: () => config.memberEmailDomain,
    coerce: requireNonEmpty('Le domaine des membres'),
  },

  'schedule.alert': {
    group: 'schedule',
    default: () => config.schedule,
    coerce: requireCron('La cadence des alertes'),
  },
  'schedule.nightly': {
    group: 'schedule',
    default: () => config.nightlySchedule,
    coerce: requireCron('La planification du redémarrage nocturne'),
  },
  'schedule.timezone': {
    group: 'schedule',
    default: () => config.timezone,
    coerce: (v) => {
      const zone = String(v ?? '').trim();
      try {
        // Throws RangeError on an unknown zone, which is the only reliable
        // check available without shipping a timezone list.
        new Intl.DateTimeFormat('en', { timeZone: zone }).format();
      } catch {
        throw new Error(`Fuseau horaire inconnu : "${zone}".`);
      }
      return zone;
    },
  },
  'alert.reminderIntervalMs': {
    group: 'schedule',
    default: () => config.reminderIntervalMs,
    coerce: (v) => {
      const ms = Number(v);
      if (!Number.isFinite(ms) || ms < HOUR_MS) {
        throw new Error("Le rappel doit valoir au moins une heure.");
      }
      return Math.round(ms);
    },
  },
  reloadMidnight: {
    group: 'schedule',
    default: () => config.reloadMidnightDefault,
    coerce: (v) => v === true || v === 'true',
  },
};

/** Defaults exposed for callers that want to show "what .env says". */
const DEFAULTS = new Proxy(
  {},
  {
    get: (_t, key) => REGISTRY[key]?.default(),
    has: (_t, key) => key in REGISTRY,
    ownKeys: () => Reflect.ownKeys(REGISTRY),
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
  }
);

/**
 * In-process cache of the stored overrides.
 *
 * Every mail send and every scheduled tick would otherwise hit Mongo for values
 * that change perhaps twice a year.
 */
let overrides = null;

async function load() {
  if (overrides) return overrides;
  const rows = await Setting.find().lean();
  overrides = new Map(rows.map((r) => [r.key, r.value]));
  return overrides;
}

/** Drops the cache so the next read reflects another instance's write. */
function invalidate() {
  overrides = null;
}

async function get(key) {
  const store = await load();
  if (store.has(key)) return store.get(key);
  return REGISTRY[key]?.default();
}

async function set(key, value) {
  const spec = REGISTRY[key];
  const coerced = spec ? spec.coerce(value) : value;
  await Setting.updateOne({ key }, { $set: { value: coerced } }, { upsert: true });
  invalidate();
  events.emit('changed', [key]);
  return coerced;
}

/** Effective values for every registered key: stored override, else env default. */
async function all() {
  const store = await load();
  const out = {};
  for (const key of Object.keys(REGISTRY)) {
    out[key] = store.has(key) ? store.get(key) : REGISTRY[key].default();
  }
  return out;
}

/**
 * Applies a patch of `{ key: value }`.
 *
 * Validation runs over the whole patch before anything is written so a typo in
 * one cron expression cannot leave half the form saved.
 */
async function update(patch) {
  const writes = [];
  const removals = [];

  for (const [key, raw] of Object.entries(patch)) {
    const spec = REGISTRY[key];
    if (!spec) throw Object.assign(new Error(`Paramètre inconnu : ${key}`), { status: 400 });

    // null means "revert to the .env default" — the row is deleted rather than
    // overwritten so a later .env edit is picked up again.
    if (raw === null) {
      removals.push(key);
      continue;
    }

    try {
      writes.push({ key, value: spec.coerce(raw) });
    } catch (err) {
      throw Object.assign(err, { status: 400 });
    }
  }

  if (removals.length) await Setting.deleteMany({ key: { $in: removals } });
  await Promise.all(
    writes.map((w) =>
      Setting.updateOne({ key: w.key }, { $set: { value: w.value } }, { upsert: true })
    )
  );

  invalidate();
  const touched = [...writes.map((w) => w.key), ...removals];
  if (touched.length) events.emit('changed', touched);
  return all();
}

/** The mail configuration the mailer should use right now. */
async function mailConfig() {
  const s = await all();
  return {
    host: s['smtp.host'],
    port: s['smtp.port'],
    secure: s['smtp.secure'],
    auth: s['smtp.user'] ? { user: s['smtp.user'], pass: s['smtp.pass'] } : null,
    from: s['mail.from'],
    memberDomain: s['mail.memberDomain'],
  };
}

module.exports = {
  Setting,
  REGISTRY,
  DEFAULTS,
  events,
  get,
  set,
  all,
  update,
  invalidate,
  mailConfig,
};

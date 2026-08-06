#!/usr/bin/env node
/**
 * Migrates a v1 database to the v2 schema.
 *
 *   node tools/migrate-v2.js            # dry run — reports, writes nothing
 *   node tools/migrate-v2.js --apply    # performs the migration
 *
 * Safe to run more than once: every step is idempotent and skips documents that
 * are already in the target shape.
 *
 * What changed between v1 and v2:
 *   - Station telemetry moved from flat fields (Battery_Voltage, …) into a
 *     `lastReading` sub-document, so a failed read can be recorded as null
 *     rather than as a fake 0 V.
 *   - Stations, modems and panneaux gained `status` / `lastSeenAt`, written by
 *     the poller instead of being probed per request.
 *   - Members gained `mustChangePassword`.
 *   - `readings` is a time-series collection and must be created as one.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');
const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/mppt';

const LEGACY_FIELDS = [
  'Battery_Voltage',
  'Charge_Current',
  'Temperature_Ambient',
  'Temperature_Battery',
  'Array_Voltage',
  'Sweep_Pmax',
  'Load_Voltage',
  'Load_Current',
];

const RETENTION_DAYS = Number(process.env.READING_RETENTION_DAYS) || 90;

let problems = 0;
const step = (n, title) => console.log(`\n── ${n}. ${title} ${'─'.repeat(Math.max(0, 52 - title.length))}`);
const ok = (msg) => console.log(`   ✅ ${msg}`);
const info = (msg) => console.log(`   ·  ${msg}`);
const warn = (msg) => { problems++; console.log(`   ⚠️  ${msg}`); };

(async () => {
  await mongoose.connect(MONGO_URL);
  const db = mongoose.connection.db;

  console.log(`\nDatabase : ${MONGO_URL.replace(/\/\/[^@]*@/, '//***@')}`);
  console.log(`Mode     : ${APPLY ? 'APPLY — changes will be written' : 'DRY RUN — nothing will be written'}`);

  const version = (await db.admin().serverStatus()).version;
  const major = Number(version.split('.')[0]);
  console.log(`MongoDB  : ${version}`);
  if (major < 5) {
    warn(`MongoDB ${version} cannot create time-series collections. Upgrade to 5.0+ before migrating.`);
    console.log('\nAborting — the readings collection cannot be created on this server.');
    await mongoose.disconnect();
    process.exit(1);
  }

  // ---------------------------------------------------------------- 1. checks
  step(1, 'Pre-flight uniqueness checks');
  // v2 adds unique indexes; duplicates would make index creation fail silently
  // at boot and leave the constraint unenforced.
  for (const [coll, field] of [
    ['sites', 'ip'],
    ['modems', 'ip'],
    ['panneaus', 'ip'],
    ['projects', 'nom'],
    ['members', 'username'],
  ]) {
    if (!(await db.listCollections({ name: coll }).hasNext())) {
      info(`${coll}: absent, skipping`);
      continue;
    }
    const dupes = await db
      .collection(coll)
      .aggregate([
        { $group: { _id: `$${field}`, n: { $sum: 1 } } },
        { $match: { n: { $gt: 1 } } },
      ])
      .toArray();
    if (dupes.length) {
      warn(`${coll}.${field}: ${dupes.length} duplicate value(s) → ${dupes.map((d) => JSON.stringify(d._id)).join(', ')}`);
      warn(`   resolve these by hand; the unique index on ${coll}.${field} cannot be built otherwise`);
    } else {
      ok(`${coll}.${field}: no duplicates`);
    }
  }

  // ------------------------------------------------- 2. sites → lastReading
  step(2, 'Stations: flat telemetry → lastReading');
  const legacyFilter = { $or: LEGACY_FIELDS.map((f) => ({ [f]: { $exists: true } })) };
  const legacySites = await db.collection('sites').find(legacyFilter).toArray();
  info(`${legacySites.length} station(s) still carry v1 telemetry fields`);

  let seeded = 0;
  let strippedOnly = 0;
  for (const site of legacySites) {
    const hasReading = site.lastReading && site.lastReading.measuredAt !== undefined;

    const update = { $unset: Object.fromEntries(LEGACY_FIELDS.map((f) => [f, ''])) };

    if (!hasReading) {
      // Carry the last known values across so nothing is lost, but flag them as
      // not freshly measured: v1 wrote 0 for an unreachable device, so a zero
      // here cannot be trusted as a real reading. The poller replaces this
      // within one sweep.
      update.$set = {
        lastReading: {
          ...Object.fromEntries(LEGACY_FIELDS.map((f) => [f, site[f] ?? null])),
          measuredAt: null,
          reachable: false,
          error: 'Valeur héritée de la version précédente — non vérifiée',
        },
      };
      seeded++;
    } else {
      strippedOnly++;
    }

    if (APPLY) await db.collection('sites').updateOne({ _id: site._id }, update);
  }
  ok(`${seeded} station(s) seeded from v1 values, ${strippedOnly} already had a reading`);
  ok(`${legacySites.length} station(s) will have the flat fields removed`);

  // -------------------------------------------- 3. defaults for new fields
  step(3, 'Default values for fields added in v2');
  const defaults = [
    ['sites', { status: { $exists: false } }, { status: false }],
    ['sites', { lastSeenAt: { $exists: false } }, { lastSeenAt: null }],
    ['sites', { lastAnalysis: { $exists: false } }, { lastAnalysis: {} }],
    ['modems', { status: { $exists: false } }, { status: false, lastSeenAt: null }],
    ['panneaus', { status: { $exists: false } }, { status: false, lastSeenAt: null }],
    // Existing members already have a password they chose; do not nag them.
    ['members', { mustChangePassword: { $exists: false } }, { mustChangePassword: false }],
  ];
  for (const [coll, filter, set] of defaults) {
    if (!(await db.listCollections({ name: coll }).hasNext())) continue;
    const n = await db.collection(coll).countDocuments(filter);
    if (n === 0) { info(`${coll}: ${Object.keys(set).join(', ')} already present`); continue; }
    if (APPLY) await db.collection(coll).updateMany(filter, { $set: set });
    ok(`${coll}: ${n} document(s) given ${Object.keys(set).join(', ')}`);
  }

  // ------------------------------------------------ 4. Battery_Type casing
  step(4, 'Battery_Type normalisation');
  const types = await db.collection('sites').distinct('Battery_Type');
  const wrong = types.filter((t) => typeof t === 'string' && t !== t.toUpperCase());
  if (!wrong.length) {
    ok(`values already uppercase: ${JSON.stringify(types)}`);
  } else {
    for (const value of wrong) {
      const n = await db.collection('sites').countDocuments({ Battery_Type: value });
      if (APPLY) {
        await db.collection('sites').updateMany(
          { Battery_Type: value },
          { $set: { Battery_Type: value.toUpperCase() } }
        );
      }
      ok(`${n} station(s): "${value}" → "${value.toUpperCase()}"`);
    }
  }
  const unknown = types.filter(
    (t) => typeof t === 'string' && !['AGM', 'LITHIUM'].includes(t.toUpperCase())
  );
  if (unknown.length) warn(`unrecognised Battery_Type values (schema allows AGM/LITHIUM): ${JSON.stringify(unknown)}`);

  // -------------------------------------------- 5. readings (time-series)
  step(5, 'Time-series collection for historical readings');
  const existing = await db.listCollections({ name: 'readings' }).toArray();
  if (!existing.length) {
    if (APPLY) {
      await db.createCollection('readings', {
        timeseries: { timeField: 'ts', metaField: 'meta', granularity: 'minutes' },
        expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60,
      });
      ok(`created as time-series, ${RETENTION_DAYS}-day retention`);
    } else {
      ok(`would be created as time-series, ${RETENTION_DAYS}-day retention`);
    }
  } else if (existing[0].type === 'timeseries') {
    ok('already exists as a time-series collection');
  } else {
    // A plain collection cannot be converted in place.
    warn("'readings' exists but is NOT a time-series collection.");
    warn('   Drop it (it holds no v1 data) and re-run: db.readings.drop()');
  }

  // ------------------------------------------------------------ 6. summary
  step(6, 'Summary');
  const counts = {};
  for (const c of ['sites', 'modems', 'panneaus', 'projects', 'members', 'licences']) {
    if (await db.listCollections({ name: c }).hasNext()) {
      counts[c] = await db.collection(c).countDocuments();
    }
  }
  info(Object.entries(counts).map(([k, v]) => `${k}=${v}`).join('  '));

  if (!counts.licences) {
    info('no licence installed yet — the API stays locked until one is uploaded');
  }

  console.log(
    problems
      ? `\n⚠️  ${problems} item(s) need attention before this migration is safe.`
      : APPLY
        ? '\n✅ Migration applied.'
        : '\n✅ Dry run clean. Re-run with --apply to write the changes.'
  );

  await mongoose.disconnect();
  process.exit(problems ? 1 : 0);
})().catch((err) => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});

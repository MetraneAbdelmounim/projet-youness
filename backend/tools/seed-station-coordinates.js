#!/usr/bin/env node
/**
 * Spreads stations that share one placeholder coordinate onto the corridor each
 * one is named after.
 *
 * ⚠ These are APPROXIMATIONS derived from station names, not surveyed
 * positions. "4-A20Ouest Sortie 95" is placed near exit 95 of Autoroute 20,
 * which is the right stretch of road but not the exact cabinet. They exist so
 * the map is usable instead of stacking two dozen pins on the project centre —
 * they are not a substitute for real GPS, and a technician should not be
 * dispatched on them. Replace them with surveyed values through the Excel
 * import as soon as those exist.
 *
 * Safe by default: prints what it would change and writes nothing until
 * `--apply` is passed. Every previous coordinate is saved first, so
 * `--revert` puts the database back exactly as it was.
 *
 *   node tools/seed-station-coordinates.js            # dry run
 *   node tools/seed-station-coordinates.js --apply
 *   node tools/seed-station-coordinates.js --revert
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../config/config');

const BACKUP = path.join(__dirname, 'station-coordinates.backup.json');

/**
 * Keyed by IP, which is stable — names get edited.
 *
 * Positions follow the real road network around Montréal: Autoroute 20 runs
 * east along the south shore with exit numbers rising towards Beloeil, A25
 * runs north–south through Mercier and Montréal-Nord, A30 rings the south
 * shore, A40 crosses the island, and Route 132 follows the river bank.
 */
const POSITIONS = {
  // ── Autoroute 20, south shore, exits rising eastward ──────────────────────
  '10.8.0.241': { nom: '6-A20Ouest Sortie 90', lat: 45.606, lon: -73.439 },
  '10.8.0.243': { nom: '5-A20Ouest Sortie 92', lat: 45.611, lon: -73.418 },
  '10.8.0.245': { nom: '4-A20Ouest Sortie 95', lat: 45.6155, lon: -73.393 },
  '10.8.0.249': { nom: '2-A20Ouest Entrée 102', lat: 45.6, lon: -73.308 },
  '10.8.0.251': { nom: '1-A20Ouest Entrée 112', lat: 45.571, lon: -73.205 },
  '10.8.0.247': { nom: '3-A20Ouest Entrée A30', lat: 45.618, lon: -73.454 },
  '10.8.0.221': { nom: '20-A20Est Entrée R132', lat: 45.539, lon: -73.515 },
  '10.8.0.197': { nom: '21-A20Est Sortie 95', lat: 45.6142, lon: -73.397 },

  // ── Autoroute 25, Mercier through Montréal-Nord ───────────────────────────
  '10.8.0.233': { nom: '13-A25 Sud Henri-Bourassa', lat: 45.6205, lon: -73.554 },
  '10.8.0.161': { nom: '26-A25S-S6', lat: 45.612, lon: -73.546 },
  '10.8.0.189': { nom: '15-A25Sud Sortie 5', lat: 45.606, lon: -73.541 },
  '10.8.0.225': { nom: '17-A25Sud Sortie 4', lat: 45.6, lon: -73.539 },
  '10.8.0.229': { nom: '18-A25Sud Sortie 3', lat: 45.593, lon: -73.537 },
  '10.8.0.231': { nom: '14-A25Sud - A25Sud', lat: 45.588, lon: -73.534 },
  '10.8.0.239': { nom: '9-A25Nord Sortie 1', lat: 45.576, lon: -73.523 },
  '10.8.0.237': { nom: '10-A25Nord Sortie 3', lat: 45.599, lon: -73.54 },

  // ── Autoroute 30, south-shore ring ────────────────────────────────────────
  '10.8.0.211': { nom: '22-A30Ouest', lat: 45.42, lon: -73.56 },
  '10.8.0.213': { nom: '23-A30Est', lat: 45.68, lon: -73.43 },

  // ── Autoroute 40, across the island ───────────────────────────────────────
  '10.8.0.205': { nom: '24-A40Est', lat: 45.605, lon: -73.547 },
  '10.8.0.207': { nom: '25-A40Ouest', lat: 45.508, lon: -73.69 },

  // ── Route 132, along the river ────────────────────────────────────────────
  '10.8.0.215': { nom: '7-R132Ouest M.Victorin', lat: 45.522, lon: -73.509 },
  '10.8.0.217': { nom: '8-R132Est R.Therrien', lat: 45.558, lon: -73.488 },

  // ── Surface streets, Mercier / Hochelaga ──────────────────────────────────
  '10.8.1.197': { nom: '11-Souligny-H.Beaugrand', lat: 45.581, lon: -73.529 },
  '10.8.0.209': { nom: '19-Dickson-Souligny', lat: 45.573, lon: -73.539 },
  '10.8.0.57': { nom: '12-Bretelle J', lat: 45.584, lon: -73.521 },

  // 'Coffret ADM' (10.8.0.177) is deliberately absent: it already carries a
  // coordinate of its own rather than the shared placeholder, so whoever set it
  // may have meant it. Overwriting a value someone chose is worse than leaving
  // an outlier visible on the map.
};

async function main() {
  const apply = process.argv.includes('--apply');
  const revert = process.argv.includes('--revert');

  await mongoose.connect(config.bdUrl);
  const sites = mongoose.connection.db.collection('sites');

  if (revert) {
    if (!fs.existsSync(BACKUP)) {
      console.error(`No backup at ${BACKUP} — nothing to revert.`);
      process.exitCode = 1;
      return;
    }
    const saved = JSON.parse(fs.readFileSync(BACKUP, 'utf8'));
    console.log(`Reverting ${saved.length} station(s) from ${BACKUP}\n`);
    for (const row of saved) {
      console.log(`  ${row.ip.padEnd(13)} -> ${row.latitude}, ${row.longitude}`);
      if (apply) {
        await sites.updateOne(
          { ip: row.ip },
          { $set: { latitude: row.latitude, longitude: row.longitude } }
        );
      }
    }
    console.log(apply ? '\nReverted.' : '\nDry run — pass --apply to write.');
    return;
  }

  const current = await sites
    .find({ ip: { $in: Object.keys(POSITIONS) } })
    .project({ ip: 1, nom: 1, latitude: 1, longitude: 1 })
    .toArray();

  const found = new Map(current.map((s) => [s.ip, s]));
  const missing = Object.keys(POSITIONS).filter((ip) => !found.has(ip));

  console.log(`Stations matched: ${found.size} / ${Object.keys(POSITIONS).length}`);
  if (missing.length) console.log(`Not in the database: ${missing.join(', ')}`);
  console.log('');

  const changes = [];
  for (const [ip, target] of Object.entries(POSITIONS)) {
    const site = found.get(ip);
    if (!site) continue;
    if (site.latitude === target.lat && site.longitude === target.lon) continue;
    changes.push({ ip, site, target });
  }

  if (!changes.length) {
    console.log('Every coordinate already matches — nothing to do.');
    return;
  }

  for (const { ip, site, target } of changes) {
    console.log(
      `  ${ip.padEnd(13)} ${String(site.nom).padEnd(28)} ` +
        `${site.latitude}, ${site.longitude}  ->  ${target.lat}, ${target.lon}`
    );
  }
  console.log(`\n${changes.length} station(s) would move.`);

  if (!apply) {
    console.log('\nDry run — nothing written. Re-run with --apply.');
    return;
  }

  // Written before the first update, so a crash midway is still recoverable.
  const backup = current.map((s) => ({
    ip: s.ip,
    nom: s.nom,
    latitude: s.latitude,
    longitude: s.longitude,
  }));
  fs.writeFileSync(BACKUP, JSON.stringify(backup, null, 2));
  console.log(`\nPrevious coordinates saved to ${BACKUP}`);

  let updated = 0;
  for (const { ip, target } of changes) {
    const res = await sites.updateOne(
      { ip },
      { $set: { latitude: target.lat, longitude: target.lon } }
    );
    updated += res.modifiedCount;
  }

  console.log(`Updated ${updated} station(s).`);
  console.log('These are approximations from station names — replace them with');
  console.log('surveyed coordinates via the Excel import when you have them.');
}

main()
  .catch((err) => {
    console.error('Failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());

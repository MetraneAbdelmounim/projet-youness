#!/usr/bin/env node
/**
 * Issues a signed licence file.
 *
 *   node tools/licence-issue.js --customer "Innovation MI8" --months 12
 *   node tools/licence-issue.js --customer "Client X" --expires 2027-01-31 --stations 50
 *
 * Options:
 *   --customer <name>   Licensee shown in the UI            (required)
 *   --expires  <date>   Expiry as YYYY-MM-DD                (or use --months)
 *   --months   <n>      Validity in months from today       (default 12)
 *   --stations <n>      Station cap; omit for unlimited
 *   --out      <path>   Output file (default ./<customer>-<expiry>.mi8lic)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { sign } = require('../licence/licenceCrypto');

const PRIVATE_PATH =
  process.env.LICENCE_PRIVATE_KEY_PATH ||
  path.join(__dirname, '..', 'config', 'licence-private-key.pem');

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const customer = arg('customer');
if (!customer) {
  console.error('--customer is required. See the header of this file for usage.');
  process.exit(1);
}

if (!fs.existsSync(PRIVATE_PATH)) {
  console.error(`No private key at ${PRIVATE_PATH}.\nRun: node tools/licence-keygen.js`);
  process.exit(1);
}

const now = new Date();

let expiresAt;
const explicitExpiry = arg('expires');
if (explicitExpiry) {
  const parsed = new Date(`${explicitExpiry}T23:59:59.999Z`);
  if (Number.isNaN(parsed.getTime())) {
    console.error(`--expires "${explicitExpiry}" is not a valid YYYY-MM-DD date.`);
    process.exit(1);
  }
  expiresAt = parsed;
} else {
  const months = Number(arg('months', 12));
  if (!Number.isFinite(months) || months <= 0) {
    console.error('--months must be a positive number.');
    process.exit(1);
  }
  expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + months);
}

if (expiresAt.getTime() <= now.getTime()) {
  console.error('Refusing to issue an already-expired licence.');
  process.exit(1);
}

const payload = {
  licenceId: crypto.randomUUID(),
  customer,
  issuedAt: now.toISOString(),
  expiresAt: expiresAt.toISOString(),
};

const stations = arg('stations');
if (stations !== undefined) {
  const cap = Number(stations);
  if (!Number.isInteger(cap) || cap <= 0) {
    console.error('--stations must be a positive integer.');
    process.exit(1);
  }
  payload.maxStations = cap;
}

const document = sign(payload, fs.readFileSync(PRIVATE_PATH, 'utf8'));

const slug = customer.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const outPath = arg('out', `${slug}-${expiresAt.toISOString().slice(0, 10)}.mi8lic`);

fs.writeFileSync(outPath, JSON.stringify(document, null, 2));

console.log(`✅ Licence issued → ${path.resolve(outPath)}`);
console.log('');
console.log(`   Licensee : ${payload.customer}`);
console.log(`   Issued   : ${payload.issuedAt.slice(0, 10)}`);
console.log(`   Expires  : ${payload.expiresAt.slice(0, 10)}`);
console.log(`   Stations : ${payload.maxStations ?? 'illimité'}`);
console.log('');
console.log('Send this file to the customer; they upload it on first start-up.');

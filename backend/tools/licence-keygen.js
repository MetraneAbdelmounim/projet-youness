#!/usr/bin/env node
/**
 * Generates the Ed25519 keypair used to sign licences.
 *
 * Run this ONCE. The public key ships with the application; the private key is
 * the vendor's signing authority and must never leave your control or enter git.
 *
 *   node tools/licence-keygen.js [--force]
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(__dirname, '..', 'config');
const PUBLIC_PATH = path.join(CONFIG_DIR, 'licence-public-key.pem');
const PRIVATE_PATH = path.join(CONFIG_DIR, 'licence-private-key.pem');

const force = process.argv.includes('--force');

if (!force && (fs.existsSync(PUBLIC_PATH) || fs.existsSync(PRIVATE_PATH))) {
  console.error(
    'A keypair already exists.\n' +
      'Regenerating invalidates every licence ever issued with the old key.\n' +
      'Pass --force if that is genuinely what you want.'
  );
  process.exit(1);
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

fs.mkdirSync(CONFIG_DIR, { recursive: true });
fs.writeFileSync(PUBLIC_PATH, publicKey.export({ type: 'spki', format: 'pem' }));
fs.writeFileSync(PRIVATE_PATH, privateKey.export({ type: 'pkcs8', format: 'pem' }), {
  mode: 0o600,
});

console.log(`✅ Public key  → ${PUBLIC_PATH}`);
console.log(`🔐 Private key → ${PRIVATE_PATH}`);
console.log('');
console.log('The public key is meant to be committed — it only verifies.');
console.log('The private key is git-ignored. Back it up somewhere safe:');
console.log('losing it means you can never issue another licence for this build.');

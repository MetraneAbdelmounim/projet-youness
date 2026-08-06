const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Licence signing and verification.
 *
 * Ed25519 is used deliberately: the private key stays with the vendor and only
 * the public key ships inside the application, so possession of the running
 * software is not enough to mint a licence. A symmetric scheme (or an expiry
 * simply written into the source, as before) can be forged by anyone holding a
 * copy of the app.
 */

const PUBLIC_KEY_PATH =
  process.env.LICENCE_PUBLIC_KEY_PATH ||
  path.join(__dirname, '..', 'config', 'licence-public-key.pem');

const LICENCE_VERSION = 1;

/**
 * Serialises the payload deterministically.
 *
 * Signature verification compares bytes, so the exact same field order must be
 * produced on both sides — `JSON.stringify` alone preserves insertion order and
 * would break as soon as a payload were rebuilt in a different order.
 */
function canonicalise(payload) {
  const ordered = {};
  for (const key of Object.keys(payload).sort()) {
    const value = payload[key];
    ordered[key] = Array.isArray(value) ? [...value].sort() : value;
  }
  return JSON.stringify(ordered);
}

function sign(payload, privateKeyPem) {
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  // Ed25519 takes no separate digest algorithm — hence `null`.
  const signature = crypto.sign(null, Buffer.from(canonicalise(payload), 'utf8'), privateKey);
  return {
    version: LICENCE_VERSION,
    payload,
    signature: signature.toString('base64'),
  };
}

let cachedPublicKey;
function publicKey() {
  if (cachedPublicKey === undefined) {
    try {
      cachedPublicKey = crypto.createPublicKey(fs.readFileSync(PUBLIC_KEY_PATH, 'utf8'));
    } catch {
      cachedPublicKey = null;
    }
  }
  return cachedPublicKey;
}

function hasPublicKey() {
  return publicKey() !== null;
}

const REQUIRED_FIELDS = ['licenceId', 'customer', 'issuedAt', 'expiresAt'];

/**
 * Validates a licence document's structure and signature.
 * Returns `{ valid, reason, payload }` — never throws on malformed input, since
 * the input is an uploaded file.
 */
function verify(document) {
  const key = publicKey();
  if (!key) {
    return { valid: false, reason: 'Aucune clé publique de licence installée sur le serveur' };
  }

  if (!document || typeof document !== 'object') {
    return { valid: false, reason: 'Fichier de licence illisible' };
  }
  if (document.version !== LICENCE_VERSION) {
    return { valid: false, reason: `Version de licence non supportée (${document.version})` };
  }

  const { payload, signature } = document;
  if (!payload || typeof payload !== 'object' || typeof signature !== 'string') {
    return { valid: false, reason: 'Structure de licence invalide' };
  }

  for (const field of REQUIRED_FIELDS) {
    if (!payload[field]) return { valid: false, reason: `Champ obligatoire manquant : ${field}` };
  }

  if (Number.isNaN(Date.parse(payload.expiresAt)) || Number.isNaN(Date.parse(payload.issuedAt))) {
    return { valid: false, reason: 'Dates de licence invalides' };
  }

  let signatureOk = false;
  try {
    signatureOk = crypto.verify(
      null,
      Buffer.from(canonicalise(payload), 'utf8'),
      key,
      Buffer.from(signature, 'base64')
    );
  } catch {
    signatureOk = false;
  }

  if (!signatureOk) {
    return { valid: false, reason: 'Signature de licence invalide ou fichier altéré' };
  }

  return { valid: true, payload };
}

/** True when the payload's expiry is in the future. */
function isCurrent(payload, now = Date.now()) {
  return Date.parse(payload.expiresAt) > now;
}

function daysRemaining(payload, now = Date.now()) {
  return Math.ceil((Date.parse(payload.expiresAt) - now) / 86400000);
}

module.exports = {
  LICENCE_VERSION,
  PUBLIC_KEY_PATH,
  canonicalise,
  sign,
  verify,
  isCurrent,
  daysRemaining,
  hasPublicKey,
};

const Licence = require('./licence');
const crypto = require('./licenceCrypto');

/**
 * Holds the licence state for the process.
 *
 * The signature is verified on load and on install, then the result is cached —
 * re-verifying on every request would put an Ed25519 check plus a database read
 * in front of all API traffic for a value that changes perhaps once a year.
 * Expiry is still evaluated per call, since that changes on its own.
 */
let cached = null; // { payload, document, installedAt } | null

async function load() {
  const record = await Licence.findOne({ key: 'active' }).lean();
  if (!record) {
    cached = null;
    return null;
  }

  const result = crypto.verify(record.document);
  if (!result.valid) {
    // A stored licence that no longer verifies means the document was tampered
    // with in the database, or the signing key was rotated.
    console.error(`Stored licence rejected: ${result.reason}`);
    cached = null;
    return null;
  }

  cached = { payload: result.payload, document: record.document, installedAt: record.installedAt };
  return cached;
}

/** Current state, suitable for returning to a client. */
function status() {
  if (!cached) {
    return {
      installed: false,
      valid: false,
      reason: 'Aucune licence installée',
    };
  }

  const { payload } = cached;
  const valid = crypto.isCurrent(payload);

  return {
    installed: true,
    valid,
    reason: valid ? null : 'Licence expirée',
    customer: payload.customer,
    licenceId: payload.licenceId,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    maxStations: payload.maxStations ?? null,
    daysRemaining: crypto.daysRemaining(payload),
    installedAt: cached.installedAt,
  };
}

function isValid() {
  return Boolean(cached) && crypto.isCurrent(cached.payload);
}

function maxStations() {
  return cached?.payload?.maxStations ?? null;
}

/**
 * Verifies and installs a licence document.
 * An expired licence is rejected at upload so the operator learns immediately,
 * rather than installing something that leaves the platform still locked.
 */
async function install(document, installedBy = null) {
  const result = crypto.verify(document);
  if (!result.valid) return { ok: false, reason: result.reason };

  const { payload } = result;
  if (!crypto.isCurrent(payload)) {
    return {
      ok: false,
      reason: `Cette licence a expiré le ${new Date(payload.expiresAt).toLocaleDateString('fr-CA')}`,
    };
  }

  await Licence.updateOne(
    { key: 'active' },
    {
      $set: {
        licenceId: payload.licenceId,
        customer: payload.customer,
        issuedAt: new Date(payload.issuedAt),
        expiresAt: new Date(payload.expiresAt),
        maxStations: payload.maxStations ?? null,
        document,
        installedAt: new Date(),
        installedBy,
      },
    },
    { upsert: true }
  );

  await load();
  return { ok: true, status: status() };
}

module.exports = { load, status, isValid, install, maxStations, hasPublicKey: crypto.hasPublicKey };

const settings = require('../config/setting');
const mailer = require('../notifications/mailer');
const Member = require('../member/member');
const asyncHandler = require('../middlewares/asyncHandler');

/** Never leave the process. */
const SECRET_KEYS = Object.entries(settings.REGISTRY)
  .filter(([, spec]) => spec.secret)
  .map(([key]) => key);

/**
 * Replaces secrets with a presence flag.
 *
 * The stored password is of no use to the operator — they can only replace it —
 * and echoing it back would put it in every browser cache and proxy log.
 */
function redact(values) {
  const out = { ...values };
  for (const key of SECRET_KEYS) {
    out[`${key}.isSet`] = Boolean(out[key]);
    delete out[key];
  }
  return out;
}

/** Effective settings plus the .env defaults, so the UI can show both. */
exports.getSettings = asyncHandler(async (_req, res) => {
  const values = await settings.all();

  const defaults = {};
  for (const key of Object.keys(settings.REGISTRY)) defaults[key] = settings.REGISTRY[key].default();

  res.status(200).json({
    values: redact(values),
    defaults: redact(defaults),
  });
});

exports.updateSettings = asyncHandler(async (req, res) => {
  const patch = req.body || {};

  // An empty password means "leave it alone". Without this the operator would
  // wipe the stored credential every time they saved an unrelated field, since
  // the form cannot pre-fill a value it is never given.
  for (const key of SECRET_KEYS) {
    if (patch[key] === '') delete patch[key];
  }

  const updated = await settings.update(patch);
  res.status(200).json({ values: redact(updated) });
});

/**
 * Tests an SMTP configuration.
 *
 * Accepts the candidate configuration in the body so it can be checked before
 * being saved — saving first would mean a wrong value silently disables every
 * alert until someone notices.
 */
exports.testMail = asyncHandler(async (req, res) => {
  const stored = await settings.all();
  const body = req.body || {};

  const pick = (key, fallbackKey) =>
    body[key] !== undefined && body[key] !== '' ? body[key] : stored[fallbackKey];

  const user = body.user !== undefined ? body.user : stored['smtp.user'];
  // A blank password with a username means "reuse the stored one".
  const pass = body.pass ? body.pass : stored['smtp.pass'];

  const to =
    body.to ||
    Member.emailFor(req.member?.username, stored['mail.memberDomain']);

  if (!to) {
    return res.status(400).json({ error: 'Aucun destinataire pour le test.' });
  }

  const result = await mailer.verifyAndSend({
    host: pick('host', 'smtp.host'),
    port: Number(pick('port', 'smtp.port')),
    secure: body.secure !== undefined ? Boolean(body.secure) : stored['smtp.secure'],
    user,
    pass,
    from: pick('from', 'mail.from'),
    to,
  });

  // A failed probe is a successful diagnosis, not a server error: the operator
  // needs the SMTP message back to fix their configuration.
  res.status(200).json({ ...result, to });
});

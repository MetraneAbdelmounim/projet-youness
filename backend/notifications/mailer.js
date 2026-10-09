const nodemailer = require('nodemailer');
const settings = require('../config/setting');
const template = require('./emailTemplate');

/**
 * The transporter is rebuilt whenever SMTP settings change.
 *
 * It used to be constructed once at module load from environment variables, so
 * editing the server details required a restart — and the operator had no way
 * to tell whether the new details worked.
 */
let cached = null;

settings.events.on('changed', (keys) => {
  if (keys.some((k) => k.startsWith('smtp.'))) cached = null;
});

/** Builds a transporter for an explicit configuration, bypassing the cache. */
function build({ host, port, secure, auth }) {
  return nodemailer.createTransport({
    host,
    port,
    secure: Boolean(secure),
    auth: auth && auth.user ? auth : undefined,
    // Without a bound the sweep can hang on an unreachable relay until the
    // scheduler's next tick, which then skips itself as "still running".
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
}

async function transporter() {
  if (!cached) {
    const mail = await settings.mailConfig();
    cached = { client: build(mail), from: mail.from };
  }
  return cached;
}

/**
 * Sends one message.
 *
 * Returns whether it was actually accepted by the server. Callers that record
 * "already notified" state must not do so on a failure, or a silent SMTP
 * outage becomes a silent alerting outage.
 */
async function send({ to, subject, html }) {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!recipients.length) {
    console.warn(`No recipients for "${subject}" — skipping.`);
    return false;
  }

  try {
    const { client, from } = await transporter();
    const info = await client.sendMail({ from, to: recipients, subject, html });
    console.log(`Mail sent (${subject}):`, info.response);
    return true;
  } catch (err) {
    // A mail failure must not abort the sweep that triggered it.
    console.error(`Failed to send "${subject}":`, err.message);
    return false;
  }
}

/**
 * Checks a candidate SMTP configuration and optionally sends a probe message.
 *
 * Takes the configuration as an argument rather than reading the stored one so
 * the operator can test credentials *before* saving them and locking the
 * platform out of its own alerting.
 */
async function verifyAndSend({ host, port, secure, user, pass, from, to }) {
  const client = build({ host, port, secure, auth: user ? { user, pass } : null });

  try {
    await client.verify();
  } catch (err) {
    return { ok: false, stage: 'connexion', message: err.message };
  }

  if (!to) return { ok: true, stage: 'connexion', message: 'Connexion au serveur SMTP réussie.' };

  try {
    const info = await client.sendMail({
      from,
      to,
      subject: 'InfraPulse — Test de configuration SMTP',
      html: template.layout({
        accent: 'good',
        title: 'Test SMTP réussi',
        subtitle: 'La plateforme peut envoyer des courriels avec la configuration enregistrée.',
        preheader: 'Votre configuration SMTP fonctionne.',
        body:
          `<div style="padding:14px 16px;background:#e3f7ee;border-radius:8px;` +
          `font:400 13px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;` +
          `color:#0f7a55;line-height:1.6;">Si vous lisez ce message, les alertes de stations ` +
          `hors ligne et le rapport de redémarrage nocturne partiront de la même façon.</div>`,
        footer: `Envoyé depuis Administration → Paramètres.`,
      }),
    });
    return { ok: true, stage: 'envoi', message: info.response || 'Message accepté par le serveur.' };
  } catch (err) {
    return { ok: false, stage: 'envoi', message: err.message };
  } finally {
    client.close();
  }
}

module.exports = {
  send,
  verifyAndSend,
  // Re-exported so callers compose a message from one import.
  layout: template.layout,
  table: template.table,
  stat: template.stat,
  statRow: template.statRow,
  escapeHtml: template.escapeHtml,
};

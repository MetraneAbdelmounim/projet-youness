const nodemailer = require('nodemailer');
const config = require('../config/config');

const transporter = nodemailer.createTransport({
  host: config.transporter.host,
  port: config.transporter.port,
  auth: config.transporter.auth || undefined,
});

/** Escapes interpolated values so a device name cannot inject markup into an email. */
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

function table(headers, rows) {
  return `
    <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%">
      <thead>
        <tr style="background-color:#f2f2f2">
          ${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows
          .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
          .join('')}
      </tbody>
    </table>`;
}

async function send({ to, subject, html }) {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!recipients.length) {
    console.warn(`No recipients for "${subject}" — skipping.`);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: config.mailOptions.from,
      to: recipients,
      subject,
      html,
    });
    console.log(`Mail sent (${subject}):`, info.response);
  } catch (err) {
    // A mail failure must not abort the sweep that triggered it.
    console.error(`Failed to send "${subject}":`, err.message);
  }
}

module.exports = { send, table, escapeHtml };

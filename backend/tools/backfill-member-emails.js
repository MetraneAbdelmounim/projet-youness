#!/usr/bin/env node
/**
 * Seeds Member.email for accounts created before the field existed.
 *
 * Alert recipients used to be derived at send time as `username@<domain>`.
 * They are now read from an address stored on each member, which is why a
 * change of mail domain — or of username — no longer silently redirects every
 * alert to a mailbox that does not exist.
 *
 * Without this backfill the upgrade would leave every existing member with an
 * empty address, and the alert sweep would correctly find nobody to write to:
 * notifications would stop the moment you deployed. So it reproduces exactly
 * what the old code would have computed.
 *
 * Safe by default: prints what it would write and changes nothing until
 * `--apply` is passed. Only members whose address is empty are touched, so it
 * is idempotent and can never overwrite an address an admin has set by hand.
 *
 *   node tools/backfill-member-emails.js                      # dry run
 *   node tools/backfill-member-emails.js --apply
 *   node tools/backfill-member-emails.js --domain orangetraffic.com --apply
 */

const mongoose = require('mongoose');
const config = require('../config/config');
const Member = require('../member/member');

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

/** What the retired Member.emailFor helper used to produce. */
function derive(username, domain) {
  const handle = String(username || '').trim();
  if (!handle) return null;
  // A username that is already an address was used verbatim, domain ignored.
  return handle.includes('@') ? handle.toLowerCase() : `${handle}@${domain}`.toLowerCase();
}

async function main() {
  const apply = process.argv.includes('--apply');
  const domain = arg('domain', config.memberEmailDomain);

  await mongoose.connect(config.bdUrl);

  const members = await Member.find({
    $or: [{ email: { $exists: false } }, { email: '' }, { email: null }],
  })
    .select('username email notification isAdmin')
    .lean();

  console.log(`Domain used for bare usernames: ${domain}`);
  console.log(`Members without an address: ${members.length}\n`);

  if (!members.length) {
    console.log('Nothing to do — every member already has an address.');
    return;
  }

  const planned = [];
  for (const member of members) {
    const email = derive(member.username, domain);
    if (!email) continue;
    planned.push({ _id: member._id, username: member.username, email, notification: member.notification });
  }

  for (const row of planned) {
    const flag = row.notification ? ' (notifications actives)' : '';
    console.log(`  ${String(row.username).padEnd(34)} -> ${row.email}${flag}`);
  }

  console.log(`\n${planned.length} member(s) would get an address.`);

  if (!apply) {
    console.log('\nDry run — nothing written. Re-run with --apply.');
    return;
  }

  let updated = 0;
  for (const row of planned) {
    const res = await Member.updateOne({ _id: row._id }, { $set: { email: row.email } });
    updated += res.modifiedCount;
  }

  console.log(`Updated ${updated} member(s).`);
  console.log('');
  console.log('These addresses are what the old code would have used. Check them in');
  console.log('Administration → Utilisateurs: an address that no longer exists will');
  console.log('bounce silently, exactly as before. Correcting one is now a field edit,');
  console.log('not a change of username or of a global domain setting.');
}

main()
  .catch((err) => {
    console.error('Failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());

# Routine version update — Windows VPS with Docker

For a VPS **already running v2**. Data is preserved; the database container is
not touched. For the one-time v1 → v2 migration, use `DEPLOYMENT.md` instead.

All commands are **PowerShell**, from an **elevated** prompt.

**~30 s downtime.** Images are built before anything stops, so the running app
stays up for the whole build.

---

## ⚠️ Two ways to lose data

1. **Never use `-v`.** `docker compose down -v` deletes the `mongo-data`
   volume and with it every reading, station and member. Plain `down` is safe.
   Nothing below uses `down` at all.
2. **No backup, no rollback.** Step 1 is not optional.

---

## 1. Back up

```powershell
cd C:\Users\mi8webservices\Desktop\projet-youness\backend

$stamp = Get-Date -Format 'yyyy-MM-dd-HHmm'
New-Item -ItemType Directory -Force "$HOME\mi8-backup" | Out-Null
docker exec mongo mongodump --db mppt --archive=/tmp/pre-update.archive --gzip
docker cp mongo:/tmp/pre-update.archive "$HOME\mi8-backup\mppt-$stamp.archive"
Get-ChildItem "$HOME\mi8-backup\mppt-$stamp.archive"
```

A file of a few MB must appear. If it is missing or zero bytes, stop.

## 2. Note the rollback point

```powershell
cd ..
git rev-parse HEAD | Out-File -Encoding ascii "$HOME\last-good-commit.txt"
Get-Content "$HOME\last-good-commit.txt"
```

## 3. Get the new version

```powershell
git fetch --all --tags
git status --short          # must be empty; commit or discard local edits first
git pull
git log --oneline -1        # confirm you are on the version you expect
```

If you tag releases, `git checkout v2.1` is preferable to `pull` — it makes the
running version unambiguous and the rollback target explicit.

## 4. Build — no downtime yet

The old containers keep serving while this runs. The Angular bundle is compiled
**inside** the image, so any UI change requires rebuilding `app`.

```powershell
cd backend
docker compose build
```

That builds `app`, `poller` and `proxy` — every service with a build section.
`mongo` is a published image and is never rebuilt. Unchanged layers come from
cache, so in practice only what you edited is recompiled.

Expect several minutes the first time after a dependency change. If the build
fails, nothing has changed on the running system — fix and rerun.

> Add `--no-cache` only when you suspect a stale layer. Add `--pull` only when
> you intend to move to newer base images; it can pull a new Node or Python
> minor and is not part of a routine update.

## 5. Recreate the containers  ⏱ downtime

```powershell
docker compose up -d
```

Compose recreates only what changed. `mongo` is untouched — its image and
config are the same — so the volume is never at risk.

```powershell
docker compose ps           # app, poller, proxy, mongo all "running"/"healthy"
```

## 6. Verify

```powershell
docker compose logs --tail=40 app
```

Look for the licence line and the schedule line:

```
🔑 Licence: Innovation MI8 — expires ...
🕒 Scheduled: alerts "*/15 * * * *", nightly restart "0 0 * * *" (America/Montreal)
Server running at http://0.0.0.0:5000
```

Then:

```powershell
curl.exe -k https://localhost/api/health
```

`{"status":"ok","db":"connected","licensed":true}`.

In the browser, sign in and confirm: the station list shows live voltages, and
**Administration → Paramètres** loads.

## 7. Reclaim disk

Old image layers accumulate with every build.

```powershell
docker image prune -f
```

Never `docker system prune --volumes` — that reaches the database volume.

---

## Rollback

```powershell
cd C:\Users\mi8webservices\Desktop\projet-youness
git checkout (Get-Content "$HOME\last-good-commit.txt")
cd backend
docker compose build
docker compose up -d
```

Only restore the archive if the new version wrote data the old one cannot read
— no update so far has done so:

```powershell
$archive = (Get-ChildItem "$HOME\mi8-backup\mppt-*.archive" |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
docker cp $archive mongo:/tmp/rollback.archive
docker exec mongo mongosh mppt --quiet --eval 'db.dropDatabase()'
docker exec mongo mongorestore --archive=/tmp/rollback.archive --gzip
docker compose restart app poller
```

---

## One-time steps for *this* release

Only for the update that moves notification addresses onto the member record.
Skip on later updates. **No `.env` change is required.**

### a. Backfill the notification addresses — do this immediately

Alert recipients used to be derived at send time as `username@<domain>`. They
now come from an `email` field stored on each member, so a change of mail
domain — or of username — no longer silently redirects every alert to a
mailbox that does not exist.

Existing accounts have no address yet, so until this runs the alert sweep
correctly finds nobody to write to and **no notification is sent**. Run it as
soon as the containers are up:

```powershell
docker compose exec app node tools/backfill-member-emails.js --domain orangetraffic.com
docker compose exec app node tools/backfill-member-emails.js --domain orangetraffic.com --apply
```

The first command changes nothing and prints what it would write. It only
fills addresses that are empty, so it is safe to re-run.

### b. Correct the addresses that moved

The backfill reproduces what the old code computed — which is wrong wherever
the client renamed a mailbox. Review them in **Administration →
Utilisateurs**: each member now shows their address under their username, and
fixing one is a field edit. Enabling notifications without an address is
refused, so an account can no longer look covered while being silently skipped.

### c. Point the mail settings at the new domain

In **Administration → Paramètres** — effective immediately, no restart:

| Field | Value |
|---|---|
| Serveur | `orangetraffic-com.mail.protection.outlook.com` |
| Adresse d'expéditeur | `notifications@orangetraffic.com` |

The server matters most: the old host is the mail entry point for the previous
tenant and rejects anything addressed to `@orangetraffic.com`, however correct
the member addresses are.

The **Domaine des membres** field is gone — nothing derives an address from it
any more.

### d. Prove mail actually leaves the VPS

**Paramètres → Tester la configuration → Envoyer un test**, to a real
`@orangetraffic.com` address. It reports the SMTP server's own reply, so a
relay refusing the sender or the recipient says so plainly.

### e. Check the licence has not lapsed

A deployment onto an expired licence boots locked: sign-in works, everything
else is refused until a licence is uploaded.

```powershell
docker compose exec -T mongo mongosh mppt --quiet --eval "db.licences.find({},{customer:1,expiresAt:1}).sort({_id:-1}).limit(1).toArray()"
```

If it has expired, issue a fresh one from the machine holding the signing key
and upload it in **Administration → Licence**:

```powershell
node tools/licence-issue.js --customer "Innovation MI8" --months 12 --stations 100
```

---

## Making "version" mean something

Both `package.json` files still say `1.0.0`, so there is no version to read
anywhere in the running system. Worth fixing before the next update — bump them
and tag the commit:

```powershell
git tag -a v2.1 -m "map, settings page, alerting fix"
git push --tags
```

Then step 3 becomes `git checkout v2.1` and the rollback target is a name
rather than a 40-character hash.

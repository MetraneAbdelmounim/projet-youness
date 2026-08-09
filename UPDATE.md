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

Only for the update that adds the map, the Paramètres page and the alerting
fix. Skip on later updates.

**No `.env` change is required** and no schema migration runs.

### a. Clear the stale alert suppression

The previous alerting code recorded "already notified" for alerts it never
sent, so a station that is currently down would stay silent for up to 12 hours
after the update. Clear it once:

```powershell
docker compose exec -T mongo mongosh mppt --quiet --eval "db.alertstates.deleteMany({})"
```

### b. Make sure someone actually receives alerts

Alerts go to members with `notification` enabled — **not** to `MAIL_TO`, which
the code never reads.

```powershell
docker compose exec -T mongo mongosh mppt --quiet --eval "db.members.find({},{username:1,isAdmin:1,notification:1}).toArray()"
```

If none has `notification: true`, enable it in **Administration →
Utilisateurs**. Admins now receive alerts for every project; other members only
for the projects assigned to them.

### c. Confirm mail actually leaves the VPS

**Administration → Paramètres → Tester la configuration**, then *Envoyer un
test*. It reports the SMTP server's own reply, so a relay that refuses the
sender or the recipient says so plainly. Settings changed here take effect
immediately — no restart — and default to the `.env` values.

### d. Check the map can reach its tile server

The map needs outbound HTTPS from the **browser**, not the VPS, to
`tiles.openfreemap.org`. If operators are on a restricted network, allow it
there; a blocked host shows pins on an empty background.

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

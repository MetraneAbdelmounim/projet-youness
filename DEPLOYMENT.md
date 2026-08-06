# v2 upgrade — in-place, Windows VPS with Docker

Upgrading the **Windows** VPS already running v1 in Docker. Data is preserved.
Access stays by IP with the self-signed certificate.

All commands are **PowerShell**, run from an **elevated** prompt in the repo.

**~10 min downtime** (step 8 → 12). Building first keeps it short.

---

## ⚠️ Three ways to lose data

1. **`docker compose down -v` deletes the database.** Never use `-v` here.
   Plain `down` is safe. Nothing below uses it.
2. **v1's mongo has no named volume.** Docker put the data in an *anonymous*
   volume; v2 uses a named one — different volumes. That is why steps 4 and 10
   dump and restore. Skip them and v2 starts with an empty database.
3. **No backup, no rollback.** Step 4 is not optional.

---

## 1. On your machine — issue the licence

v2 serves nothing until a signed licence is installed.

```powershell
cd backend
node tools/licence-keygen.js        # once ever — back up config\licence-private-key.pem
node tools/licence-issue.js --customer "Innovation MI8" --months 12 --stations 100
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # JWT secret
```

Copy the `.mi8lic` onto the VPS (RDP clipboard, a share, or `scp` if OpenSSH is
enabled). Commit `backend/config/licence-public-key.pem`; never the private key.

---

## 2. On the VPS — two blocking checks

```powershell
docker version --format '{{.Server.Os}}'    # must print: linux
docker exec mongo mongosh --quiet --eval 'db.version()'
```

- **Docker must be in Linux-container mode.** The images are Linux. If this
  prints `windows`, switch Docker Desktop to Linux containers first.
- **MongoDB must be 5.0+.** v2 stores history in a time-series collection.
  If older, upgrade MongoDB as a *separate* job — doing both at once makes any
  failure impossible to diagnose.

---

## 3. Note the rollback point

```powershell
cd C:\path\to\projet-youness
git rev-parse HEAD | Tee-Object "$HOME\v1-commit.txt"
docker compose -f backend\docker-compose.yml ps
```

---

## 4. Back up

```powershell
New-Item -ItemType Directory -Force "$HOME\mi8-backup" | Out-Null
$stamp = Get-Date -Format 'yyyy-MM-dd-HHmm'

docker exec mongo mongodump --db mppt --archive=/tmp/v1.archive --gzip
docker cp mongo:/tmp/v1.archive "$HOME\mi8-backup\mppt-v1-$stamp.archive"
docker cp app:/usr/src/app/uploads "$HOME\mi8-backup\uploads-v1"

Get-ChildItem "$HOME\mi8-backup"        # must be megabytes, not bytes
docker exec mongo mongosh mppt --quiet --eval 'print("sites="+db.sites.countDocuments()+" members="+db.members.countDocuments()+" projects="+db.projects.countDocuments())'
```

**Write those counts down** — step 11 must match. Copy the archive off the VPS too.

---

## 5. Get v2

```powershell
cd C:\path\to\projet-youness
git fetch --all
git checkout <v2-branch-or-tag>
```

---

## 6. Create `backend\.env`

```powershell
cd backend
Copy-Item .env.example .env
notepad .env
```

Minimum:

```ini
NODE_ENV=production
JWT_SECRET=<the secret from step 1>
JWT_EXPIRATION=590h
MONGO_URL=mongodb://mongo:27017/mppt
HOST_PY=poller
PORT_PY=8000
VENDOR_NAME=<your company — shown as the renewal contact>
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
MAIL_FROM=notifications@innovationmi8.com
MAIL_TO=dgagnon@innovationmi8.com,yberayeteb@innovationmi8.com
CORS_ORIGINS=
```

Restrict it to administrators:

```powershell
icacls .env /inheritance:r /grant:r "Administrators:(R,W)" "SYSTEM:(R,W)"
```

> The v1 JWT key and SMTP password are in git history — treat them as
> compromised and use new values. A new `JWT_SECRET` logs everyone out once.

---

## 7. Build — before any downtime

```powershell
docker compose build
```

Several minutes (Angular + Chromium). **If this fails, stop** — nothing has been
touched yet.

---

## 8. Stop v1  ⏱ downtime starts

```powershell
docker compose down          # no -v
```

---

## 9. Start the new mongo (creates the named volume, empty)

```powershell
docker compose up -d mongo
Start-Sleep -Seconds 10
docker compose ps mongo
```

---

## 10. Restore v1 data into it

`docker cp` does not expand wildcards, so resolve the newest archive first:

```powershell
$archive = (Get-ChildItem "$HOME\mi8-backup\mppt-v1-*.archive" |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
$archive        # confirm it is the one you expect

docker cp $archive mongo:/tmp/restore.archive
docker exec mongo mongorestore --archive=/tmp/restore.archive --gzip
```

---

## 11. Migrate the schema

Dry run first — writes nothing:

```powershell
docker compose run --rm --no-deps --entrypoint node app tools/migrate-v2.js
```

Read the output. It reports duplicate IPs/names that would break the new unique
indexes, how many stations convert, and whether the time-series collection can
be created. **Resolve every ⚠️ before continuing.**

Apply:

```powershell
docker compose run --rm --no-deps --entrypoint node app tools/migrate-v2.js --apply
```

Confirm the counts still match step 4:

```powershell
docker exec mongo mongosh mppt --quiet --eval 'print("sites="+db.sites.countDocuments()+" members="+db.members.countDocuments()+" projects="+db.projects.countDocuments())'
```

**If they do not match, stop and go to step 15.**

Idempotent — safe to re-run. It moves flat telemetry into `lastReading`, adds
`status`/`lastSeenAt`, sets `mustChangePassword: false` on existing members,
uppercases `Battery_Type`, and creates `readings` as a time-series collection
with 90-day retention.

---

## 12. Start everything  ⏱ downtime ends

```powershell
docker compose up -d
docker compose ps
docker compose logs --tail=30 app
```

Expected — the licence warning is normal here:

```
Connected to the database
🔒 Aucune licence installée. The API is locked until a valid licence is uploaded.
🕒 Scheduled: alerts "*/15 * * * *", nightly restart "0 0 * * *"
```

---

## 13. Install the licence

```powershell
curl.exe -k -X POST -F "licence=@$HOME\licence.mi8lic" https://VPS_IP/api/licence
curl.exe -sk https://VPS_IP/api/licence/status
```

Expect `"valid":true`. Or open `https://VPS_IP/` and drop the file on the
activation screen.

> Use `curl.exe`, not `curl` — in PowerShell, bare `curl` is an alias for
> `Invoke-WebRequest`, which takes different arguments.

---

## 14. Verify

```powershell
curl.exe -sk https://VPS_IP/api/health      # {"status":"ok","db":"connected","licensed":true}
curl.exe -s http://127.0.0.1:8000/health    # poller — not exposed publicly
docker compose logs -f poller               # "Sweep finished in 8.1s (26 stations)"
```

Confirm the poller can actually reach the device network (this is the one thing
Windows/WSL networking can break):

```powershell
docker exec poller ping -c 2 10.8.0.251
```

If that fails but the Windows host can ping the device, the container is not
routing to the VPN subnet — check Docker Desktop's network settings before
assuming the app is at fault.

In the browser at `https://VPS_IP/` (accept the certificate warning):

- [ ] log in — v1 passwords still work
- [ ] stations show voltages within one poll interval (5 min)
- [ ] unreachable stations read `—`, not `0 V`
- [ ] Administration tabs: Stations · Modems · Panneaux · Projets · Utilisateurs · Licence
- [ ] station detail draws the history chart (fills in as data accrues)
- [ ] light/dark toggle works

---

## 15. Rollback

```powershell
cd C:\path\to\projet-youness\backend
docker compose down                        # no -v
cd ..
git checkout (Get-Content "$HOME\v1-commit.txt")

cd backend
docker compose up -d mongo
Start-Sleep -Seconds 10

$archive = (Get-ChildItem "$HOME\mi8-backup\mppt-v1-*.archive" |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
docker cp $archive mongo:/tmp/rollback.archive
docker exec mongo mongosh mppt --quiet --eval 'db.dropDatabase()'
docker exec mongo mongorestore --archive=/tmp/rollback.archive --gzip
docker compose up -d
```

v1 ignores the fields v2 added, so the pre-migration archive restores cleanly.

---

## After

**Nightly backup** — there was no routine before. Create
`C:\scripts\mi8-backup.ps1`:

```powershell
$stamp = Get-Date -Format 'yyyy-MM-dd'
docker exec mongo mongodump --db mppt --archive=/tmp/nightly.archive --gzip
docker cp mongo:/tmp/nightly.archive "C:\backups\mppt-$stamp.archive"
Get-ChildItem "C:\backups\mppt-*.archive" |
  Where-Object LastWriteTime -lt (Get-Date).AddDays(-30) | Remove-Item
```

Register it:

```powershell
New-Item -ItemType Directory -Force C:\backups | Out-Null
schtasks /create /tn "MI8 Mongo Backup" /tr "powershell -NoProfile -File C:\scripts\mi8-backup.ps1" /sc daily /st 03:00 /ru SYSTEM
```

**Close port 27017.** v1 published MongoDB unauthenticated; v2 no longer does,
but the firewall rule may still exist:

```powershell
Get-NetFirewallRule | Where-Object DisplayName -like '*27017*'
Remove-NetFirewallRule -DisplayName '<the rule name>'     # if one is found
```

**Auto-start on reboot.** `restart: always` handles the containers, provided the
Docker service itself starts automatically:

```powershell
Get-Service com.docker.service | Select-Object Name, StartType, Status
Set-Service com.docker.service -StartupType Automatic
```

**Poller tuning** in `.env` (restart `poller` after changes):

| Variable | Default | Meaning |
|---|---|---|
| `POLL_INTERVAL_SECONDS` | `300` | seconds between sweeps |
| `POLL_CONCURRENCY` | `16` | devices read in parallel |
| `READING_RETENTION_DAYS` | `90` | history kept before expiry |

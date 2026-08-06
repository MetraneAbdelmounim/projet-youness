# v2 upgrade — in-place, existing VPS

Upgrading the Linux VPS already running v1 in Docker. Data is preserved.
Access stays by IP with the self-signed certificate.

**~10 min downtime** (step 8 to step 12). Build beforehand keeps it short.

---

## ⚠️ Three ways to lose data

1. **`docker compose down -v` deletes the database.** Never use `-v` on this
   server. Plain `down` is safe. Every command below is written without it.
2. **v1's mongo has no named volume.** The official image put the data in an
   *anonymous* volume; v2 uses a named one. They are different volumes — that
   is why steps 4/10 dump and restore. Skipping them gives you an empty database.
3. **No backup, no rollback.** Step 4 is not optional.

---

## 1. On your own machine — issue the licence

v2 serves nothing until a signed licence is installed.

```bash
cd backend
node tools/licence-keygen.js        # once ever — back up config/licence-private-key.pem
node tools/licence-issue.js --customer "Innovation MI8" --months 12 --stations 100
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # JWT secret
```

Copy the `.mi8lic` to the VPS:

```bash
scp *.mi8lic user@VPS_IP:~/
```

Commit `backend/config/licence-public-key.pem`. Never commit the private key.

---

## 2. On the VPS — check MongoDB (this can stop the upgrade)

```bash
docker exec mongo mongosh --quiet --eval 'db.version()' \
  || docker exec mongo mongo --quiet --eval 'db.version()'
```

**5.0 or newer → continue. Older → stop.** v2 needs time-series collections.
Upgrade MongoDB as a separate job first; doing both at once makes any failure
impossible to diagnose.

---

## 3. Note the rollback point

```bash
cd /path/to/projet-youness
git rev-parse HEAD | tee ~/v1-commit.txt
docker compose -f backend/docker-compose.yml ps
```

---

## 4. Back up

```bash
mkdir -p ~/mi8-backup
docker exec mongo mongodump --db mppt --archive=/tmp/v1.archive --gzip
docker cp mongo:/tmp/v1.archive ~/mi8-backup/mppt-v1-$(date +%F-%H%M).archive
docker cp app:/usr/src/app/uploads ~/mi8-backup/uploads-v1 2>/dev/null || true

ls -lh ~/mi8-backup/          # must be megabytes, not bytes
docker exec mongo mongosh mppt --quiet --eval \
  'print("sites="+db.sites.countDocuments()+" members="+db.members.countDocuments()+" projects="+db.projects.countDocuments())'
```

**Write those counts down.** Step 11 must match them. Copy the archive off the
server too.

---

## 5. Get v2

```bash
cd /path/to/projet-youness
git fetch --all
git checkout <v2-branch-or-tag>
```

---

## 6. Create `backend/.env`

```bash
cd backend
cp .env.example .env
nano .env
chmod 600 .env
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

> The v1 JWT key and SMTP password are in git history — treat them as
> compromised and use new values. A new `JWT_SECRET` logs everyone out once.

---

## 7. Build — before any downtime

```bash
docker compose build
```

Takes several minutes (Angular + Chromium). **If this fails, stop here** —
nothing has been touched yet.

---

## 8. Stop v1  ⏱ downtime starts

```bash
docker compose down          # no -v
```

---

## 9. Start the new mongo (creates the named volume, empty)

```bash
docker compose up -d mongo
sleep 10
docker compose ps mongo
```

---

## 10. Restore v1 data into it

```bash
docker cp ~/mi8-backup/mppt-v1-*.archive mongo:/tmp/restore.archive
docker exec mongo mongorestore --archive=/tmp/restore.archive --gzip
```

---

## 11. Migrate the schema

Dry run first — writes nothing:

```bash
docker compose run --rm --no-deps --entrypoint node app tools/migrate-v2.js
```

Read the output. It reports duplicate IPs/names that would break the new unique
indexes, how many stations convert, and whether the time-series collection can
be created. **Resolve every ⚠️ before continuing.**

Apply:

```bash
docker compose run --rm --no-deps --entrypoint node app tools/migrate-v2.js --apply
```

Confirm the counts still match step 4:

```bash
docker exec mongo mongosh mppt --quiet --eval \
  'print("sites="+db.sites.countDocuments()+" members="+db.members.countDocuments()+" projects="+db.projects.countDocuments())'
```

**If they do not match, stop and go to step 15.**

The migration is idempotent — safe to re-run. It moves flat telemetry into
`lastReading`, adds `status`/`lastSeenAt`, sets `mustChangePassword: false` on
existing members, uppercases `Battery_Type`, and creates `readings` as a
time-series collection with 90-day retention.

---

## 12. Start everything  ⏱ downtime ends

```bash
docker compose up -d
docker compose ps
docker compose logs --tail=30 app
```

Expected — the licence warning is normal at this point:

```
Connected to the database
🔒 Aucune licence installée. The API is locked until a valid licence is uploaded.
🕒 Scheduled: alerts "*/15 * * * *", nightly restart "0 0 * * *"
```

---

## 13. Install the licence

```bash
curl -k -X POST -F "licence=@$HOME/<file>.mi8lic" https://VPS_IP/api/licence
curl -sk https://VPS_IP/api/licence/status
```

Expect `"valid":true`. Or just open `https://VPS_IP/` — the activation screen
takes the file by drag-and-drop.

---

## 14. Verify

```bash
curl -sk https://VPS_IP/api/health        # {"status":"ok","db":"connected","licensed":true}
curl -s  http://127.0.0.1:8000/health     # poller — not exposed publicly
docker compose logs -f poller             # "Sweep finished in 8.1s (26 stations)"
```

In the browser at `https://VPS_IP/` (accept the self-signed warning):

- [ ] log in — v1 passwords still work
- [ ] stations show voltages within one poll interval (5 min)
- [ ] unreachable stations read `—`, not `0 V`
- [ ] Administration tabs: Stations · Modems · Panneaux · Projets · Utilisateurs · Licence
- [ ] station detail draws the history chart (fills in as data accrues)
- [ ] light/dark toggle works

---

## 15. Rollback

```bash
cd /path/to/projet-youness/backend
docker compose down                       # no -v
cd .. && git checkout $(cat ~/v1-commit.txt)

cd backend && docker compose up -d mongo && sleep 10
docker cp ~/mi8-backup/mppt-v1-*.archive mongo:/tmp/rollback.archive
docker exec mongo mongosh mppt --quiet --eval 'db.dropDatabase()'
docker exec mongo mongorestore --archive=/tmp/rollback.archive --gzip
docker compose up -d
```

v1 ignores the fields v2 added, so the pre-migration archive restores cleanly.

---

## After

**Nightly backups** — there was no routine before:

```bash
echo '0 3 * * * root docker exec mongo mongodump --db mppt --archive=/var/backups/mppt-$(date +\%F).archive --gzip' \
  | sudo tee /etc/cron.d/mi8-backup
sudo mkdir -p /var/backups
```

**Poller tuning**, in `.env` (restart `poller` after changing):

| Variable | Default | Meaning |
|---|---|---|
| `POLL_INTERVAL_SECONDS` | `300` | seconds between sweeps |
| `POLL_CONCURRENCY` | `16` | devices read in parallel |
| `READING_RETENTION_DAYS` | `90` | history kept before expiry |

**Ports.** Only 80/443 need to be open. v2 stopped publishing MongoDB's 27017 —
v1 exposed it unauthenticated to the whole network. If your firewall still
allows it, close it:

```bash
sudo ufw delete allow 27017 2>/dev/null || true
sudo ufw status
```

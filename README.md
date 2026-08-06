# MI8 MPPT Monitoring Platform

Monitors solar charge controllers (MPPT), modems and trail panels reachable by
IP over Modbus TCP, and forecasts end-of-day battery voltage from local weather.

## Architecture

```
┌─────────────┐   1 request per page
│  Angular 19 │ ─────────────────────────► ┌──────────────┐
│  (SPA)      │ ◄───────────────────────── │  Node/Express│
└─────────────┘   stations + telemetry     │  :5000       │
                  + analysis + status      └──────┬───────┘
                                                  │ reads only
                                           ┌──────▼───────┐
                                           │   MongoDB    │
                                           │  sites       │
                                           │  readings ⏱  │  time-series, 90d TTL
                                           └──────▲───────┘
                                                  │ writes
                                           ┌──────┴───────┐
                     Modbus TCP :502 ◄──── │ Python poller│ ──► open-meteo
                     ICMP            ◄──── │  :8000       │     (cached 30 min)
                                           └──────────────┘
```

The Python service owns all device I/O. It sweeps every device on a fixed
interval, writes telemetry to MongoDB, and precomputes the weather-adjusted
analysis. Node reads from MongoDB and never touches a device except for the two
operator-initiated control actions (restart, refresh network config).

This is the central design decision. Previously the browser triggered a live
Modbus read per rendered station, so a page view cost `2 × stations` HTTP
requests and as many device round-trips, serialised behind a single-threaded
Flask development server.

## Services

| Service  | Port | Role |
|----------|------|------|
| `proxy`  | 80/443 | nginx, TLS termination |
| `app`    | 5000 | REST API + static Angular bundle |
| `poller` | 8000 | Device polling, control actions |
| `mongo`  | —    | Datastore (not published) |

## Running it

### Docker

```bash
cd backend
cp .env.example .env    # fill in — see "Secrets" below
docker compose up --build
```

### Locally

```bash
# 1. MongoDB 5.0+ on 127.0.0.1:27017 (time-series collections need 5.0)

# 2. API
cd backend
cp .env.example .env
npm install
npm run dev

# 3. Poller
cd backend/python
python -m venv venv && venv/Scripts/activate     # or source venv/bin/activate
pip install -r requirements.txt
playwright install chromium
python -m uvicorn app:app --port 8000 --reload

# 4. Frontend (dev server on :4200, proxying to :5000)
cd front-end
npm install
npm start
```

`npm run build` in `front-end/` emits into `backend/public/`, which the API
serves in production.

### Build cache location (Windows/OneDrive)

The project sits inside a OneDrive folder. OneDrive syncs `.angular/cache` and
holds open handles on the files Angular needs to replace, which makes `ng serve`
fail with:

```
EPERM: operation not permitted, rmdir '...\.angular\cache\<ver>\Front-mi8\vite\deps'
```

`angular.json` therefore points the CLI cache outside the synced tree:

```json
"cli": { "cache": { "enabled": true, "environment": "all", "path": "C:/Users/nassi/AppData/Local/ng-cache/projet-youness" } }
```

**That path is machine-specific.** On another machine, change it to any local
(non-synced) directory, or set `"enabled": false` to disable caching entirely.

If the error reappears, a previous `ng serve` is usually still running and
holding the lock — stop it before retrying:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='esbuild.exe'" |
  Select-Object ProcessId, CommandLine
Stop-Process -Id <ng serve pid>,<esbuild pid> -Force
```

## Licensing

The platform refuses every business endpoint until a **signed licence** is
installed. Validity rests on an Ed25519 signature: the private key stays with
you, only the public key ships in the application, so possession of the software
is not enough to mint a licence.

### Two parties, don't mix them up

| Role | Who | Where it lives |
|---|---|---|
| **Vendor** — issues licences | You, the publisher | `VENDOR_NAME` env var |
| **Licensee** — runs the install | The customer, e.g. Innovation MI8 | `customer` field inside the signed licence |

The UI reads the licensee from the licence itself, so it is always accurate and
cannot be edited in the browser. The vendor comes from `VENDOR_NAME` and is what
the licence screen points at for renewals. Leave `VENDOR_NAME` empty and the UI
falls back to "votre fournisseur" rather than naming the wrong party — a
customer must never be told to contact themselves to renew.

> Note: "Innovation MI8" appears in the page title, login footer, logo asset and
> email subjects as the **first customer's** branding. That is deliberate for
> this deployment. Onboarding a second customer means changing those strings —
> they are not yet driven by configuration.

### One-time setup (vendor side)

```bash
cd backend
node tools/licence-keygen.js
```

Writes `config/licence-public-key.pem` (commit it — it only verifies) and
`config/licence-private-key.pem` (git-ignored). **Back the private key up.**
Losing it means never being able to issue another licence for this build.

### Issuing a licence

```bash
node tools/licence-issue.js --customer "Innovation MI8" --months 12
node tools/licence-issue.js --customer "Client X" --expires 2027-01-31 --stations 50
```

Produces a `.mi8lic` file to send to the customer.

### Customer side

On first start-up the app shows an activation screen at `/#/licence` where the
`.mi8lic` file is dropped in. Admins can review or replace it later from the
account menu → **Licence**.

| Situation | Behaviour |
|---|---|
| No licence | All `/api/*` business routes return `402 LICENCE_MISSING` |
| Expired | `402 LICENCE_EXPIRED` |
| < 30 days left | Renewal banner across the top of the app |

Upload is unauthenticated only while no valid licence exists — on first run
there is no account to log in with. Replacing a valid licence requires an admin.
This is safe because a licence must carry a signature from your private key: an
anonymous caller can supply one but cannot forge one.

`/api/auth/*`, `/api/health` and `/api/licence/*` stay outside the gate, so an
operator whose licence has lapsed can still sign in and install a new one.

Verified against forgery: a licence signed with a different key, one whose
expiry was edited, a genuine-but-expired licence, and a malformed file are all
rejected with a specific reason.

## Theming

Light and dark are both first-class, switched from the header (light → dark →
follow system) and remembered in `localStorage`. `main.ts` applies the stored
choice before Angular boots, so there is no flash of the wrong palette.

Colours live as semantic tokens in `src/styles.css` (`--surface`, `--ink`,
`--good`, `--series-1`, …), re-declared under `.dark` and exposed to Tailwind via
`@theme inline`. Components use roles (`bg-surface`, `text-ink-muted`) rather
than raw colours, and charts read the same tokens, so a theme switch repaints
everything from one source of truth.

Values were verified rather than eyeballed: every text/background pair clears
WCAG 4.5:1, and the chart series were run through a palette validator against
both surfaces (worst adjacent CVD ΔE 24.7 light / 26.8 dark, against a ≥8
target). Status is never conveyed by colour alone — every chip carries a dot and
a text label.

## Secrets

**All secrets now come from the environment.** `backend/.env` is git-ignored;
`backend/.env.example` lists every variable.

> The previous `config.js` hard-coded a JWT signing key (a well-known public
> example token), an SMTP password and an admin password hash. Those values are
> still readable in git history and **must be treated as compromised**. Generate
> new ones before deploying:
>
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
> ```

The API refuses to start in production if `JWT_SECRET` is unset rather than
falling back to a default.

## Configuration

Polling behaviour (`backend/.env`, read by the Python service):

| Variable | Default | Meaning |
|----------|---------|---------|
| `POLL_INTERVAL_SECONDS` | `300` | Seconds between full sweeps |
| `POLL_CONCURRENCY` | `16` | Devices read in parallel |
| `MODBUS_TIMEOUT` | `3.0` | Per-read timeout, seconds |
| `WEATHER_TTL_SECONDS` | `1800` | Forecast cache lifetime |
| `WEATHER_COORD_PRECISION` | `2` | Decimals used to bucket coordinates (~1 km) |
| `READING_RETENTION_DAYS` | `90` | Time-series retention |

Scheduling (read by Node):

| Variable | Default | Meaning |
|----------|---------|---------|
| `ALERT_SCHEDULE` | `*/15 * * * *` | Alert sweep cadence |
| `NIGHTLY_SCHEDULE` | `0 0 * * *` | Nightly restart, when enabled in the UI |
| `REMINDER_INTERVAL_MS` | `43200000` | Minimum gap between repeat alerts |

## Data model

- **`sites`** — one document per station. Carries `lastReading` and
  `lastAnalysis`, both refreshed by the poller, plus `status`/`lastSeenAt`.
- **`readings`** — MongoDB time-series collection, one document per successful
  poll, expiring after `READING_RETENTION_DAYS`. Backs the history chart.
- **`settings`** — operator toggles (e.g. nightly restart) that must survive a
  restart and stay consistent across instances.
- **`alertstates`** — open alerts, so reminder suppression is not lost on deploy.

Measurements are **nullable**. A device that cannot be read stores `null` with
`reachable: false`, which keeps "unknown" distinguishable from a real reading of
0 V — the latter previously tripped the low-voltage alert on every offline
station.

## Authorization model

- Identity comes solely from the signed JWT; the member is re-read from the
  database on every request, so role changes and deletions take effect at once.
- `requireAdmin` checks the database, not a token claim.
- `requireProjectAccess` scopes every station/modem/panel query to projects the
  caller belongs to, and leaves the authorized id on `req.projectId` so
  controllers filter by a validated value.
- `requireSelfOrAdmin` guards member-scoped routes; a member can only change
  their own password, and must supply the current one.
- Password hashes are `select: false` and stripped in `toJSON`.

## Notes

- Spreadsheet imports are parsed in memory and never written to disk; the
  `uploads/` directory is no longer served.
- Imports report per-row failures (`errors[]`) instead of reporting success
  before any write has run.
- The refresh action drives the controller's web UI through a single shared
  headless Chromium, started lazily and reused.

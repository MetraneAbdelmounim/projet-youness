const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const config = require('./config/config');
const errorHandler = require('./middlewares/errorHandler');
const scheduler = require('./notifications/scheduler');

const licenceService = require('./licence/licenceService');
const authRoute = require('./auth/authRoute');
const licenceRoute = require('./licence/licenceRoute');
const siteRoute = require('./site/SiteRoute');
const modemRoute = require('./modem/modemRoute');
const panneauRoute = require('./panneau/panneauRoute');
const memberRoute = require('./member/memberRoute');
const projectRoute = require('./project/projectRoute');

const app = express();
const STATIC_ROOT = path.join(__dirname, 'public/browser');

// --- Security headers -------------------------------------------------------
app.use(
  helmet({
    // The Angular bundle is served from this origin; CSP is configured below.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        // The weather panel queries open-meteo straight from the browser.
        connectSrc: ["'self'", 'https://api.open-meteo.com'],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    // Devices are reached over plain HTTP on the LAN; leave HSTS to the proxy.
    hsts: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Same-origin deployments need no CORS at all; a dev UI on :4200 does.
app.use(
  cors({
    origin: config.corsOrigins.length ? config.corsOrigins : false,
    credentials: true,
  })
);

// --- Parsing ----------------------------------------------------------------
// 1 MB is ample for this API's JSON payloads; the previous 500 MB ceiling made
// a single request enough to exhaust the process.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

app.use(logger(config.isProduction ? 'combined' : 'dev'));

// --- API --------------------------------------------------------------------
// Global ceiling; the sign-in route adds a much tighter one of its own.
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de requêtes. Réessayez dans un instant.' },
  })
);

app.get('/api/health', (req, res) =>
  res.status(200).json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    licensed: licenceService.isValid(),
  })
);

// Health, auth and licence sit outside the licence gate: an operator whose
// licence has lapsed must still be able to sign in and upload a new one.
app.use('/api/licence', licenceRoute);
app.use('/api/auth', authRoute);
app.use('/api/stations', siteRoute);
app.use('/api/members', memberRoute);
app.use('/api/modems', modemRoute);
app.use('/api/panneaus', panneauRoute);
app.use('/api/projects', projectRoute);

app.use('/api', (req, res) => res.status(404).json({ error: 'Route introuvable' }));

// --- Static SPA -------------------------------------------------------------
// `uploads/` is deliberately not served: spreadsheet imports are now parsed in
// memory and never written to disk.
app.use(express.static(STATIC_ROOT, { index: false, maxAge: '1y', etag: true }));
app.get('*', (req, res) => res.sendFile(path.join(STATIC_ROOT, 'index.html')));

app.use(errorHandler);

module.exports = { app, config };

// --- Bootstrap --------------------------------------------------------------
if (require.main === module) {
  mongoose
    .connect(config.bdUrl)
    .then(async () => {
      console.log('Connected to the database');

      await licenceService.load();
      const licence = licenceService.status();
      if (licence.valid) {
        console.log(
          `🔑 Licence: ${licence.customer} — expires ${new Date(licence.expiresAt).toISOString().slice(0, 10)} (${licence.daysRemaining} days)`
        );
      } else {
        console.warn(
          `🔒 ${licence.reason}. The API is locked until a valid licence is uploaded at /api/licence.`
        );
      }

      scheduler.start();
      app.listen(config.PORT, () => {
        console.log(`Server running at http://${config.HOST}:${config.PORT}`);
      });
    })
    .catch((err) => {
      console.error('Database connection failed:', err.message);
      process.exit(1);
    });

  const shutdown = async (signal) => {
    console.log(`\n${signal} received — shutting down.`);
    await mongoose.connection.close().catch(() => {});
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

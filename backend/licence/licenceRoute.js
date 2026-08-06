const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const licenceController = require('./licenceController');
const licenceService = require('./licenceService');
const { authenticate, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 64 * 1024, files: 1 },
}).single('licence');

// The install endpoint is reachable without a session during first run, so it
// gets its own tight limit to stop it being used to grind at signatures.
const installLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
});

/**
 * Requires an admin session only once a valid licence is already installed.
 *
 * First run has no users and no way to authenticate, so the upload must be open
 * then. Once the platform is licensed and staffed, replacing the licence is an
 * administrative act.
 */
function guardReplacement(req, res, next) {
  if (!licenceService.isValid()) return next();
  return authenticate(req, res, (err) => (err ? next(err) : requireAdmin(req, res, next)));
}

router.get('/status', licenceController.getStatus);
router.post('', installLimiter, guardReplacement, upload, licenceController.install);

module.exports = router;

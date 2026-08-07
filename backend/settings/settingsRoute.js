const express = require('express');
const rateLimit = require('express-rate-limit');
const settingsController = require('./settingsController');
const licenceGuard = require('../middlewares/licenceGuard');
const { authenticate, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

router.use(licenceGuard, authenticate, requireAdmin);

router.get('', settingsController.getSettings);
router.put('', settingsController.updateSettings);

/**
 * Bounded separately: each call opens a real SMTP connection to a host named in
 * the request, so an unbounded endpoint would let an admin account be used to
 * probe arbitrary hosts and ports.
 */
const testLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tests SMTP. Réessayez dans quelques minutes.' },
});

router.post('/test-mail', testLimiter, settingsController.testMail);

module.exports = router;

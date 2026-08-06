const licenceService = require('../licence/licenceService');

/**
 * Blocks the API when no valid licence is installed.
 *
 * Replaces the previous check against a date compiled into the source, which
 * anyone with the code could read and edit. Validity now rests on an Ed25519
 * signature the application can verify but not produce.
 *
 * Responds 402 with a stable `code` so the client can route to the licence
 * screen instead of guessing from message text. Auth, health and the licence
 * endpoints themselves are intentionally not behind this guard, so an operator
 * can still sign in and upload a replacement.
 */
module.exports = (req, res, next) => {
  if (licenceService.isValid()) return next();

  const state = licenceService.status();
  return res.status(402).json({
    code: state.installed ? 'LICENCE_EXPIRED' : 'LICENCE_MISSING',
    error: state.installed
      ? 'Votre licence a expiré. Veuillez installer une licence valide.'
      : "Aucune licence n'est installée. Veuillez téléverser votre fichier de licence.",
  });
};

const licenceService = require('./licenceService');
const config = require('../config/config');
const asyncHandler = require('../middlewares/asyncHandler');

const MAX_LICENCE_BYTES = 64 * 1024;

module.exports = {
  /**
   * Licence state. Deliberately unauthenticated: the first-run screen has to
   * render before anyone can log in, and the response carries no secret — only
   * the licensee name and expiry, both of which the operator already knows.
   */
  getStatus: asyncHandler(async (req, res) => {
    return res.status(200).json({
      ...licenceService.status(),
      signingKeyPresent: licenceService.hasPublicKey(),
      // Who to contact for a renewal — the vendor, never the licensee.
      vendor: config.vendorName,
    });
  }),

  /**
   * Installs an uploaded licence.
   *
   * Left unauthenticated while no valid licence is installed, because at that
   * point the API is locked and nobody can obtain a session. Replacing a valid
   * licence requires an admin — enforced in the route.
   *
   * This is safe: the document must carry a signature from the vendor's private
   * key, so an anonymous caller can supply a licence but cannot forge one.
   */
  install: asyncHandler(async (req, res) => {
    const raw = req.file?.buffer;
    if (!raw) return res.status(400).json({ error: 'Aucun fichier de licence fourni' });

    if (raw.length > MAX_LICENCE_BYTES) {
      return res.status(400).json({ error: 'Fichier de licence trop volumineux' });
    }

    let document;
    try {
      document = JSON.parse(raw.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Fichier de licence illisible (JSON invalide)' });
    }

    const result = await licenceService.install(document, req.member?.username ?? null);
    if (!result.ok) return res.status(400).json({ error: result.reason });

    return res.status(200).json({
      message: 'Licence installée avec succès',
      licence: result.status,
    });
  }),
};

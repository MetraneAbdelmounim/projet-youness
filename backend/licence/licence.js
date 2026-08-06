const mongoose = require('mongoose');

/**
 * The installed licence.
 *
 * `key` is pinned so the collection holds at most one document — installing a
 * new licence replaces the active one rather than accumulating rows.
 */
const licenceSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'active', unique: true },

    licenceId: { type: String, required: true },
    customer: { type: String, required: true },
    issuedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    maxStations: { type: Number, default: null },

    // The verbatim uploaded document, so the signature stays checkable and the
    // file can be re-exported for support.
    document: { type: mongoose.Schema.Types.Mixed, required: true },

    installedAt: { type: Date, default: Date.now },
    installedBy: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Licence', licenceSchema);

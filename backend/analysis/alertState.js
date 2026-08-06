const mongoose = require('mongoose');

/**
 * Open alerts, so reminder suppression survives a restart.
 *
 * Previously held in an in-process Map keyed by IP alone, which both lost all
 * state on deploy and let a station and a panneau on the same address overwrite
 * each other. `kind` is part of the key to keep those separate.
 */
const alertStateSchema = new mongoose.Schema(
  {
    kind: { type: String, required: true, enum: ['Site', 'Panneau'] },
    ip: { type: String, required: true },
    reason: { type: String, required: true },
    lastNotifiedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

alertStateSchema.index({ kind: 1, ip: 1 }, { unique: true });

module.exports = mongoose.model('AlertState', alertStateSchema);

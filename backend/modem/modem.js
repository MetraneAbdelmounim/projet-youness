const mongoose = require('mongoose');

const modemSchema = mongoose.Schema(
  {
    ip: { type: String, required: true, unique: true, trim: true },
    nom: { type: String, required: true, trim: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },

    // Reachability, refreshed by the poller rather than probed per request.
    status: { type: Boolean, default: false },
    lastSeenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Modem', modemSchema);

const mongoose = require('mongoose');

/**
 * Historical telemetry, one document per successful poll.
 *
 * Stored as a MongoDB time-series collection: readings are written once and
 * only ever queried by site over a time range, which is exactly the access
 * pattern time-series buckets are optimised for. Documents expire after
 * READING_RETENTION_DAYS so the collection stays bounded without a cleanup job.
 */
const RETENTION_DAYS = Number(process.env.READING_RETENTION_DAYS) || 90;

const readingSchema = new mongoose.Schema(
  {
    ts: { type: Date, required: true },
    meta: {
      site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },
      project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    },
    Battery_Voltage: Number,
    Charge_Current: Number,
    Temperature_Ambient: Number,
    Temperature_Battery: Number,
    Array_Voltage: Number,
    Sweep_Pmax: Number,
    Load_Voltage: Number,
    Load_Current: Number,
  },
  {
    timeseries: {
      timeField: 'ts',
      metaField: 'meta',
      granularity: 'minutes',
    },
    expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60,
    versionKey: false,
  }
);

module.exports = mongoose.model('Reading', readingSchema);

const mongoose = require('mongoose');

/**
 * Latest known telemetry for a station.
 *
 * `measuredAt`/`reachable` make a stale or failed read distinguishable from a
 * genuine zero — previously a device that could not be reached was written as
 * 0 V, which then tripped the low-voltage alert.
 */
const readingSchema = new mongoose.Schema(
  {
    Battery_Voltage: { type: Number, default: null },
    Charge_Current: { type: Number, default: null },
    Temperature_Ambient: { type: Number, default: null },
    Temperature_Battery: { type: Number, default: null },
    Array_Voltage: { type: Number, default: null },
    Sweep_Pmax: { type: Number, default: null },
    Load_Voltage: { type: Number, default: null },
    Load_Current: { type: Number, default: null },
    measuredAt: { type: Date, default: null },
    reachable: { type: Boolean, default: false },
    error: { type: String, default: null },
  },
  { _id: false }
);

/**
 * Latest weather-adjusted forecast, computed by the poller.
 *
 * Precomputing this removes a Modbus read and an open-meteo call from the
 * request path — the analysis page used to trigger both, per site, per viewer.
 */
const analysisSchema = new mongoose.Schema(
  {
    temperature_ext: Number,
    avg_remaining_cloud: Number,
    sun_hours: Number,
    remaining_sun_hours: Number,
    battery_type: String,
    battery_capacity_loss: Number,
    solar_charge_loss_clouds: Number,
    solar_charge_efficiency: Number,
    predicted_end_day_voltage: Number,
    current_battery_voltage: Number,
    performance: { type: String, enum: ['UP', 'MEDIUM', 'DOWN', 'UNKNOWN'], default: 'UNKNOWN' },
    computedAt: Date,
  },
  { _id: false }
);

const siteSchema = mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    ip: { type: String, required: true, unique: true, trim: true },
    nom: { type: String, required: true, trim: true },
    Battery_Type: { type: String, enum: ['AGM', 'LITHIUM'], default: 'AGM', uppercase: true },
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },

    lastReading: { type: readingSchema, default: () => ({}) },
    lastAnalysis: { type: analysisSchema, default: () => ({}) },

    // ICMP reachability, refreshed by the poller.
    status: { type: Boolean, default: false },
    lastSeenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

siteSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Site', siteSchema);

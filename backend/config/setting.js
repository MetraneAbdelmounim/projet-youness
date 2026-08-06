const mongoose = require('mongoose');
const config = require('./config');

/**
 * Runtime settings that operators can change from the UI.
 *
 * These used to be mutated on the `config` module object, which meant a change
 * was lost on restart and never reached a second process. A single document
 * keeps every instance in agreement.
 */
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

const Setting = mongoose.model('Setting', settingSchema);

const DEFAULTS = {
  reloadMidnight: config.reloadMidnightDefault,
};

async function get(key) {
  const doc = await Setting.findOne({ key }).lean();
  return doc ? doc.value : DEFAULTS[key];
}

async function set(key, value) {
  await Setting.updateOne({ key }, { $set: { value } }, { upsert: true });
  return value;
}

module.exports = { Setting, get, set, DEFAULTS };

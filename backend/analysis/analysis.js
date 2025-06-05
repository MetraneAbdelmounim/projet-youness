const mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

var Float = require('mongoose-float').loadType(mongoose, 2);

const analysisSchema = mongoose.Schema({
    _id : {type:mongoose.Schema.Types.ObjectId,unique:true},
    temperature_ext: { type: Float, required: false, default: 0 },
    avg_remaining_cloud: { type: Number, required: false, default: 0 },
    sun_hours: { type: Float, required: false, default: 0 },
    remaining_sun_hours: { type: Float, required: false, default: 0 },
    battery_type: { type: String, required: false, default: "" },
    battery_capacity_loss: { type: Number, required: false, default: 0 },
    solar_charge_loss_clouds: { type: Number, required: false, default: 0 },
    solar_charge_efficiency: { type: Number, required: false, default: 0 },
    predicted_end_day_voltage: { type: Float, required: false, default: 0 },
    current_battery_voltage: { type: Float, required: false, default: 0 },
    performance: { type: String, required: false, default: "DOWN" }
});


module.exports = mongoose.model('analysis', analysisSchema)
const mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

var Float = require('mongoose-float').loadType(mongoose, 2);

const siteSchema = mongoose.Schema({
    _id : mongoose.Schema.Types.ObjectId,
    ip :{type: String,required:true},
    nom:{type: String,required:true},
    Battery_Voltage:{type:Float,required:false},
    Charge_Current:{type:Float,required:false},
    Temperature_Ambient:{type:Float,required:false},
    Array_Voltage:{type:Float,required:false},
    Sweep_Pmax:{type:Float,required:false},
    Load_Voltage:{type:Float,required:false},
    Load_Current:{type:Float,required:false},
    status:{type: Boolean,required:false,default:true},

});

siteSchema.plugin(uniqueValidator);
module.exports = mongoose.model('Site', siteSchema)
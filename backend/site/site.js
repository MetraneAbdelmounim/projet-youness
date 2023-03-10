const mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

var Float = require('mongoose-float').loadType(mongoose, 2);

const siteSchema = mongoose.Schema({
    _id : mongoose.Schema.Types.ObjectId,
    ip :{type: String,required:true},
    nom:{type: String,required:true},
    Battery_Voltage:{type:Float,required:false,default: 0},
    Charge_Current:{type:Float,required:false,default: 0},
    Temperature_Ambient:{type:Float,required:false,default: 0},
    Temperature_Battery:{type:Float,required:false,default: 0},
    Array_Voltage:{type:Float,required:false,default: 0},
    Sweep_Pmax:{type:Float,required:false,default: 0},
    Load_Voltage:{type:Float,required:false,default: 0},
    Load_Current:{type:Float,required:false,default:0},
    status:{type: Boolean,required:false,default:true},

});

siteSchema.plugin(uniqueValidator);
module.exports = mongoose.model('Site', siteSchema)
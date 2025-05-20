const mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

var Float = require('mongoose-float').loadType(mongoose, 2);

const siteSchema = mongoose.Schema({
    _id : {type:mongoose.Schema.Types.ObjectId,unique:true},
    ip :{type: String,required:true,unique:true},
    nom:{type: String,required:true},
    latitude:{type:Float,required:false,default: 0},
    longitude:{type:Float,required:false,default: 0},
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


module.exports = mongoose.model('Site', siteSchema)
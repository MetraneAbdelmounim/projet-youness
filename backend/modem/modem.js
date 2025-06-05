const mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

var Float = require('mongoose-float').loadType(mongoose, 2);

const modemSchema = mongoose.Schema({
    _id : {type:mongoose.Schema.Types.ObjectId,unique:true},
    ip :{type: String,required:true,unique:true},
    nom:{type: String,required:true},
  

});


module.exports = mongoose.model('Modem', modemSchema)
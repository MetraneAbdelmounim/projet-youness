
const mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

const memberSchema = mongoose.Schema({
    _id : mongoose.Schema.Types.ObjectId,
    username:{type: String,required:true},
    password : {type : String,required:true},
    actif : {type:Boolean,required:true,default:false},
    isAdmin : {type : Boolean,required:true,default: false}

});
memberSchema.plugin(uniqueValidator);
module.exports = mongoose.model('Member', memberSchema)
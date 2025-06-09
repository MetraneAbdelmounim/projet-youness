const mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');



const memberSchema = mongoose.Schema({
    _id : {type: mongoose.Schema.Types.ObjectId,unique:true},
    username:{type: String,required:true,unique:true},
    password : {type:String,required:true},
    isAdmin : {type:Boolean,required:true,default:false},
    actif:{type: Boolean,required:false,default:false},
    notification:{type: Boolean,required:false,default:false},

});


module.exports = mongoose.model('Member', memberSchema)
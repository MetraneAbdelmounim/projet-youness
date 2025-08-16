const mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

var Float = require('mongoose-float').loadType(mongoose, 2);

const panneauSchema = mongoose.Schema({
    _id : {type:mongoose.Schema.Types.ObjectId,unique:true},
    ip :{type: String,required:true,unique:true},
    nom:{type: String,required:true},
    project:{type:mongoose.Schema.Types.ObjectId,ref: 'Project' },
  

});
panneauSchema.pre('find',function(next) {
    this.populate('project');
    next();
})
panneauSchema.pre('findOne',function(next) {
    this.populate('project');
    next();
})

module.exports = mongoose.model('Panneau', panneauSchema)
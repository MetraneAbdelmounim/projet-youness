const mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

const Site = require('../site/site');
const Modem = require('../modem/modem')
const Panneau = require('../panneau/panneau')
const User = require('../member/member')
const projectSchema = mongoose.Schema({
    _id : {type:mongoose.Schema.Types.ObjectId,unique:true},
    nom:{type: String,required:true},
    ville : {type:String,required:true},

});

projectSchema.pre('deleteOne', async function (next) {
  try {
    const project = await this.model.findOne(this.getFilter());
    if (project) {
      await Site.deleteMany({ project: project._id });
      await Modem.deleteMany({ project: project._id });
      await Panneau.deleteMany({ project: project._id });
    }
    next();
  } catch (err) {
    next(err);
  }
});

projectSchema.pre('deleteOne', async function (next) {
  try {
    const project = await this.model.findOne(this.getFilter());
    if (project) {
      // Remove the project ID from all users
      await User.updateMany(
        { projects: project._id },
        { $pull: { projects: project._id } }
      );
    }
    next();
  } catch (err) {
    next(err);
  }
})
module.exports = mongoose.model('Project', projectSchema)
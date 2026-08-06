const mongoose = require('mongoose');

const projectSchema = mongoose.Schema(
  {
    nom: { type: String, required: true, unique: true, trim: true },
    ville: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

/**
 * Cascade on delete: drop the project's devices, its readings, and its
 * membership references. Previously split across two hooks that each re-read
 * the project; one pass is enough.
 */
projectSchema.pre('deleteOne', { document: false, query: true }, async function (next) {
  try {
    const project = await this.model.findOne(this.getFilter()).lean();
    if (!project) return next();

    // Required lazily: these models reference Project, so importing at module
    // scope would create a require cycle.
    const Site = require('../site/site');
    const Reading = require('../site/reading');
    const Modem = require('../modem/modem');
    const Panneau = require('../panneau/panneau');
    const Member = require('../member/member');

    await Promise.all([
      Site.deleteMany({ project: project._id }),
      Reading.deleteMany({ 'meta.project': project._id }),
      Modem.deleteMany({ project: project._id }),
      Panneau.deleteMany({ project: project._id }),
      Member.updateMany({ projects: project._id }, { $pull: { projects: project._id } }),
    ]);

    return next();
  } catch (err) {
    return next(err);
  }
});

module.exports = mongoose.model('Project', projectSchema);

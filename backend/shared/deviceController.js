const asyncHandler = require('../middlewares/asyncHandler');
const { accessibleProjectIds } = require('../middlewares/auth');
const { parseSheet, importByIp, sendWorkbook } = require('./spreadsheet');

const WRITABLE = ['ip', 'nom', 'project'];

function pick(body) {
  return Object.fromEntries(
    Object.entries(body || {}).filter(([k]) => WRITABLE.includes(k))
  );
}

function scopeToMember(filter, member) {
  const allowed = accessibleProjectIds(member);
  if (allowed === null) return filter;
  return { ...filter, project: { $in: allowed } };
}

/**
 * Builds the CRUD + import/export handlers for a simple IP-addressed device.
 *
 * Modems and panneaux had byte-for-byte identical controllers apart from the
 * model, the sheet name and the French wording, so both now come from here.
 * Reachability is read from the store the poller maintains instead of running
 * an ICMP probe inside the request.
 */
module.exports = function deviceController({ Model, param, sheetName, filename, labels }) {
  return {
    add: asyncHandler(async (req, res) => {
      const doc = await Model.create(pick(req.body));
      return res.status(201).json({ message: `Un nouveau ${labels.singular} a été ajouté avec succès !`, [labels.key]: doc });
    }),

    update: asyncHandler(async (req, res) => {
      const doc = await Model.findByIdAndUpdate(
        req.params[param],
        { $set: pick(req.body) },
        { new: true, runValidators: true }
      );
      if (!doc) return res.status(404).json({ error: `${labels.Singular} introuvable` });
      return res.status(200).json({ message: `Le ${labels.singular} a été modifié avec succès !`, [labels.key]: doc });
    }),

    remove: asyncHandler(async (req, res) => {
      const result = await Model.deleteOne({ _id: req.params[param] });
      if (!result.deletedCount) return res.status(404).json({ error: `${labels.Singular} introuvable` });
      return res.status(200).json({ message: `Le ${labels.singular} a été supprimé avec succès` });
    }),

    getAll: asyncHandler(async (req, res) => {
      const docs = await Model.find(scopeToMember({}, req.member))
        .populate('project')
        .sort({ nom: 1 })
        .lean();
      return res.status(200).json(docs);
    }),

    getByProject: asyncHandler(async (req, res) => {
      const docs = await Model.find({ project: req.projectId })
        .populate('project')
        .sort({ nom: 1 })
        .lean();
      return res.status(200).json(docs);
    }),

    getStatus: asyncHandler(async (req, res) => {
      const doc = await Model.findOne(scopeToMember({ ip: req.params.ip }, req.member))
        .select('ip status lastSeenAt')
        .lean();
      if (!doc) return res.status(404).json({ error: `${labels.Singular} introuvable` });
      return res.status(200).json({ alive: doc.status, lastSeenAt: doc.lastSeenAt });
    }),

    addFromFile: asyncHandler(async (req, res) => {
      if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });

      const rows = parseSheet(req.file.buffer, sheetName, { A: 'ip', B: 'nom', C: 'project' });
      const result = await importByIp(Model, rows);

      return res.status(result.errors.length ? 207 : 201).json({
        message: `${result.imported} ${labels.plural} ajouté(s)/modifié(s)`,
        ...result,
      });
    }),

    exportAll: asyncHandler(async (req, res) => {
      const docs = await Model.find(scopeToMember({}, req.member)).populate('project').lean();
      await sendWorkbook(res, {
        sheetName,
        filename,
        columns: [
          { header: 'ip', key: 'ip', width: 30 },
          { header: 'nom', key: 'nom', width: 30 },
          { header: 'project', key: 'project', width: 30 },
        ],
        rows: docs.map((d) => ({ ip: d.ip, nom: d.nom, project: d.project?.nom || '' })),
      });
    }),
  };
};

const axios = require('axios').default;
const config = require('../config/config');
const Site = require('./site');
const Reading = require('./reading');
const settings = require('../config/setting');
const asyncHandler = require('../middlewares/asyncHandler');
const { accessibleProjectIds } = require('../middlewares/auth');
const { parseSheet, importByIp, sendWorkbook } = require('../shared/spreadsheet');

const PY_BASE = `http://${config.HOST_PY}:${config.PORT_PY}`;
/**
 * Must exceed the Python service's own action timeout (REFRESH_TIMEOUT_MS, 30s)
 * plus browser start-up. If this proxy gives up first, the operator is told the
 * refresh failed while it is still running and about to succeed.
 */
const CONTROL_TIMEOUT_MS = Number(process.env.CONTROL_TIMEOUT_MS) || 45000;

/** Fields a client may set on a station. */
const WRITABLE = ['ip', 'nom', 'Battery_Type', 'latitude', 'longitude', 'project'];

function pick(body, allowed) {
  return Object.fromEntries(
    Object.entries(body || {}).filter(([k]) => allowed.includes(k))
  );
}

/** Restricts a query to the projects the caller may read. */
function scopeToMember(filter, member) {
  const allowed = accessibleProjectIds(member);
  if (allowed === null) return filter; // admin
  return { ...filter, project: { $in: allowed } };
}

module.exports = {
  addSite: asyncHandler(async (req, res) => {
    const site = await Site.create(pick(req.body, WRITABLE));
    return res
      .status(201)
      .json({ message: 'Un nouveau site a été ajouté avec succès !', site });
  }),

  updateSite: asyncHandler(async (req, res) => {
    const site = await Site.findByIdAndUpdate(
      req.params.idSite,
      { $set: pick(req.body, WRITABLE) },
      { new: true, runValidators: true }
    );
    if (!site) return res.status(404).json({ error: 'Site introuvable' });
    return res.status(200).json({ message: 'Le site a été modifié avec succès !', site });
  }),

  deleteSite: asyncHandler(async (req, res) => {
    const result = await Site.deleteOne({ _id: req.params.idSite });
    if (!result.deletedCount) return res.status(404).json({ error: 'Site introuvable' });
    return res.status(200).json({ message: 'Le site a été supprimé avec succès' });
  }),

  /**
   * Every station of a project, with its latest reading, analysis and
   * reachability already attached.
   *
   * This is the single call that backs the station list, the dashboard and the
   * analysis page. Each of those previously rendered one child component per
   * station that fetched its own data, which turned one page view into roughly
   * `2 × stations` HTTP requests and as many live Modbus reads.
   */
  getSitesByProject: asyncHandler(async (req, res) => {
    const sites = await Site.find({ project: req.projectId })
      .populate('project')
      .sort({ nom: 1 })
      .lean();
    return res.status(200).json(sites);
  }),

  /** Every station the caller is allowed to see. */
  getAllSites: asyncHandler(async (req, res) => {
    const sites = await Site.find(scopeToMember({}, req.member))
      .populate('project')
      .sort({ nom: 1 })
      .lean();
    return res.status(200).json(sites);
  }),

  getSiteById: asyncHandler(async (req, res) => {
    const site = await Site.findOne(scopeToMember({ _id: req.params.idSite }, req.member))
      .populate('project')
      .lean();
    if (!site) return res.status(404).json({ error: 'Site introuvable' });
    return res.status(200).json(site);
  }),

  /** Latest telemetry for one station, served from the store the poller writes. */
  getDataBySite: asyncHandler(async (req, res) => {
    const site = await Site.findOne(scopeToMember({ _id: req.params.idSite }, req.member))
      .select('nom ip status lastSeenAt lastReading')
      .lean();
    if (!site) return res.status(404).json({ error: 'Site introuvable' });
    return res.status(200).json(site);
  }),

  getAnalysisBySite: asyncHandler(async (req, res) => {
    const site = await Site.findOne(scopeToMember({ _id: req.params.idSite }, req.member))
      .select('nom ip lastAnalysis')
      .lean();
    if (!site) return res.status(404).json({ error: 'Site introuvable' });
    return res.status(200).json(site.lastAnalysis || {});
  }),

  /**
   * Historical readings for charting.
   *
   * This is what the time-series collection exists for — before, only the most
   * recent value was kept, so no trend could be shown or reviewed after an
   * incident.
   */
  getHistoryBySite: asyncHandler(async (req, res) => {
    const site = await Site.findOne(scopeToMember({ _id: req.params.idSite }, req.member))
      .select('_id')
      .lean();
    if (!site) return res.status(404).json({ error: 'Site introuvable' });

    const hours = Math.min(Math.max(Number(req.query.hours) || 24, 1), 24 * 90);
    const from = new Date(Date.now() - hours * 3600 * 1000);

    const readings = await Reading.find({ 'meta.site': site._id, ts: { $gte: from } })
      .sort({ ts: 1 })
      .limit(5000)
      .lean();

    return res.status(200).json(readings);
  }),

  getStatusSite: asyncHandler(async (req, res) => {
    const site = await Site.findOne(scopeToMember({ ip: req.params.ip }, req.member))
      .select('ip status lastSeenAt')
      .lean();
    if (!site) return res.status(404).json({ error: 'Site introuvable' });
    return res.status(200).json({ alive: site.status, lastSeenAt: site.lastSeenAt });
  }),

  addSiteFromFile: asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });

    const rows = parseSheet(req.file.buffer, 'sites', {
      A: 'ip',
      B: 'nom',
      C: 'latitude',
      D: 'longitude',
      E: 'Battery_Type',
      F: 'project',
    });

    const result = await importByIp(Site, rows);
    return res.status(result.errors.length ? 207 : 201).json({
      message: `${result.imported} site(s) ajouté(s)/modifié(s)`,
      ...result,
    });
  }),

  exportAllSites: asyncHandler(async (req, res) => {
    const sites = await Site.find(scopeToMember({}, req.member)).populate('project').lean();
    await sendWorkbook(res, {
      sheetName: 'sites',
      filename: 'sites.xlsx',
      columns: [
        { header: 'ip', key: 'ip', width: 30 },
        { header: 'nom', key: 'nom', width: 30 },
        { header: 'latitude', key: 'latitude', width: 30 },
        { header: 'longitude', key: 'longitude', width: 30 },
        { header: 'Battery_Type', key: 'Battery_Type', width: 30 },
        { header: 'project', key: 'project', width: 30 },
      ],
      rows: sites.map((s) => ({
        ip: s.ip,
        nom: s.nom,
        latitude: s.latitude,
        longitude: s.longitude,
        Battery_Type: s.Battery_Type,
        project: s.project?.nom || '',
      })),
    });
  }),

  /**
   * Device control actions, proxied to the Python service.
   * These are the only calls that still reach a device synchronously, because
   * an operator is waiting on the outcome.
   */
  restartSite: asyncHandler(async (req, res) => {
    const site = await Site.findById(req.params.idSite).lean();
    if (!site) return res.status(404).json({ error: 'Site introuvable' });

    try {
      const { data } = await axios.post(
        `${PY_BASE}/control/reload/${site.ip}`,
        {},
        { timeout: CONTROL_TIMEOUT_MS }
      );
      return res.status(200).json({ success: data.success, message: `${data.message} — ${site.nom}` });
    } catch (err) {
      console.error(`Restart failed for ${site.nom} (${site.ip}):`, err.message);
      return res
        .status(502)
        .json({ error: `Impossible de redémarrer ${site.nom}`, site: site.nom });
    }
  }),

  refreshSite: asyncHandler(async (req, res) => {
    const site = await Site.findById(req.params.idSite).lean();
    if (!site) return res.status(404).json({ error: 'Site introuvable' });

    try {
      const { data } = await axios.post(
        `${PY_BASE}/control/refresh/${site.ip}`,
        {},
        { timeout: CONTROL_TIMEOUT_MS }
      );
      return res.status(200).json({ success: data.success, message: `${data.message} — ${site.nom}` });
    } catch (err) {
      console.error(`Refresh failed for ${site.nom} (${site.ip}):`, err.message);
      return res
        .status(502)
        .json({ error: `Impossible de rafraîchir ${site.nom}`, site: site.nom });
    }
  }),

  /**
   * Forces an immediate re-read of one station.
   *
   * The poller sweeps on a fixed interval, so a station restarted moments ago
   * still shows its last swept state. The admin screen calls this after a
   * control action to reflect what actually happened.
   */
  pollSite: asyncHandler(async (req, res) => {
    const site = await Site.findOne(scopeToMember({ _id: req.params.idSite }, req.member))
      .select('ip nom')
      .lean();
    if (!site) return res.status(404).json({ error: 'Site introuvable' });

    try {
      const { data } = await axios.post(
        `${PY_BASE}/control/poll/${site.ip}`,
        {},
        { timeout: CONTROL_TIMEOUT_MS }
      );
      return res.status(200).json({
        _id: site._id,
        ip: site.ip,
        status: data.status,
        lastSeenAt: data.lastSeenAt,
        measuredAt: data.measuredAt,
      });
    } catch (err) {
      console.error(`Immediate poll failed for ${site.nom} (${site.ip}):`, err.message);
      return res.status(502).json({ error: `Impossible de sonder ${site.nom}` });
    }
  }),

  getMidnightReload: asyncHandler(async (req, res) => {
    return res.status(200).json(await settings.get('reloadMidnight'));
  }),

  changeMidnightReload: asyncHandler(async (req, res) => {
    // Accept the historical misspelling so an older client keeps working.
    const raw = req.body?.reload_midnight ?? req.body?.reload_midgniht;
    if (typeof raw !== 'boolean') {
      return res.status(400).json({ error: 'Le champ reload_midnight (booléen) est requis' });
    }

    await settings.set('reloadMidnight', raw);
    return res.status(200).json({
      message: `Le redémarrage à minuit des stations a été ${raw ? 'activé' : 'désactivé'}`,
      reload_midnight: raw,
    });
  }),
};

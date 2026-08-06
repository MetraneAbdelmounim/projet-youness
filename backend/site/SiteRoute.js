const express = require('express');
const siteController = require('./siteController');
const licenceGuard = require('../middlewares/licenceGuard');
const { uploadSpreadsheet } = require('../middlewares/upload');
const { authenticate, requireAdmin, requireProjectAccess } = require('../middlewares/auth');

const router = express.Router();

router.use(licenceGuard, authenticate);

// --- Static paths first, so they are not captured by /:idSite ---
router.get('/midnightReload', requireAdmin, siteController.getMidnightReload);
router.put('/midnightReload', requireAdmin, siteController.changeMidnightReload);
router.get('/export', requireAdmin, siteController.exportAllSites);
router.get('/ping', siteController.getAllSites);

router.post('', requireAdmin, siteController.addSite);
router.post('/file', requireAdmin, uploadSpreadsheet, siteController.addSiteFromFile);

// The project must be one the caller belongs to; `getAllSites` is scoped to the
// caller's projects rather than returning every station on the platform.
router.get('', requireProjectAccess('project'), siteController.getSitesByProject);
router.get('/projects/:idProject', requireProjectAccess(), siteController.getSitesByProject);

router.get('/status/:ip', siteController.getStatusSite);
router.get('/data/analysis/:idSite', siteController.getAnalysisBySite);
router.get('/data/:idSite', siteController.getDataBySite);
router.get('/history/:idSite', siteController.getHistoryBySite);

router.post('/poll/:idSite', siteController.pollSite);
router.post('/reload/:idSite', requireAdmin, siteController.restartSite);
router.post('/refresh/:idSite', requireAdmin, siteController.refreshSite);

router.delete('/:idSite', requireAdmin, siteController.deleteSite);
router.put('/:idSite', requireAdmin, siteController.updateSite);
router.get('/:idSite', siteController.getSiteById);

module.exports = router;

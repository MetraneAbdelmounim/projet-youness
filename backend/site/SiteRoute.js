const authUser = require('../middlewares/authUser')
const authAdmin = require('../middlewares/authAdmin')
const licenceGuard = require('../middlewares/licenceGuard')
const siteController = require('./siteController')
let path =require('path')
let express = require('express');
let router = express.Router();
const multer = require('multer')
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null,path.join('uploads/'));
    },
    filename: function (req, file, cb) {
        cb(null, path.join(Date.now().toString()+file.originalname))
    }
});
var upload = multer({
    storage: storage
});


router.post('',licenceGuard,authAdmin,siteController.addSite)
router.post('/file',licenceGuard ,authAdmin,upload.single('file'),siteController.addSiteFromFile)
router.get('',licenceGuard ,authUser,siteController.getAllSites2)
router.get('/ping',licenceGuard ,authUser,siteController.getAllSitesWithoutData)
router.get('/status/:ip',licenceGuard ,authUser,siteController.getStatusSite)
router.get('/data/:idSite',licenceGuard ,authUser,siteController.getDataBySiteFromMPPT)
router.get('/data/analysis/:idSite',licenceGuard ,authUser,siteController.getDataAnalysisBySiteFromMPPT)
router.delete('/:idSite',licenceGuard ,authAdmin,siteController.deleteSite)
router.put('/:idSite',licenceGuard ,authAdmin,siteController.updateSite)
router.get('/export',licenceGuard ,authAdmin,siteController.exportAllSites)
router.post('/reload/:idSite',licenceGuard ,authAdmin,siteController.restarSite)
router.post('/refresh/:idSite',licenceGuard ,authAdmin,siteController.refreshSite)
router.get('/:idSite',licenceGuard ,authUser,siteController.getSiteByIdWithoutDATA)

module.exports=router
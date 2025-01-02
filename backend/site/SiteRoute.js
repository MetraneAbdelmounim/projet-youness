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


router.post('/sites',licenceGuard,authAdmin,siteController.addSite)
router.post('/sites/file',licenceGuard ,authAdmin,upload.single('file'),siteController.addSiteFromFile)
router.get('/sites',licenceGuard ,authUser,siteController.getAllSites2)
router.get('/sites/ping',licenceGuard ,authUser,siteController.getAllSitesWithoutData)
router.get('/sites/status/:ip',licenceGuard ,authUser,siteController.getStatusSite)
router.get('/sites/data/:idSite',licenceGuard ,authUser,siteController.getDataBySiteFromMPPT)
router.delete('/sites/:idSite',licenceGuard ,authAdmin,siteController.deleteSite)
router.put('/sites/:idSite',licenceGuard ,authAdmin,siteController.updateSite)
module.exports=router
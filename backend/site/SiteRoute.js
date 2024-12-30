const authUser = require('../middlewares/authUser')
const authAdmin = require('../middlewares/authAdmin')
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


router.post('/sites',authAdmin,siteController.addSite)
router.post('/sites/file',authAdmin,upload.single('file'),siteController.addSiteFromFile)
router.get('/sites',authUser,siteController.getAllSites2)
router.get('/sites/ping',authUser,siteController.getAllSitesWithoutData)
router.get('/sites/status/:ip',authUser,siteController.getStatusSite)
router.get('/sites/data/:idSite',authUser,siteController.getDataBySiteFromMPPT)
router.delete('/sites/:idSite',authAdmin,siteController.deleteSite)
router.put('/sites/:idSite',authAdmin,siteController.updateSite)
module.exports=router
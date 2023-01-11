const auth = require('../middlewares/auth')
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


router.post('/sites',auth,siteController.addSite)
router.post('/sites/file',auth,upload.single('file'),siteController.addSiteFromFile)
router.get('/sites',auth,siteController.getAllSites)
router.get('/sites/ping',auth,siteController.getAllSitesWithoutData)
router.delete('/sites/:idSite',auth,siteController.deleteSite)
router.put('/sites/:idSite',auth,siteController.updateSite)
module.exports=router
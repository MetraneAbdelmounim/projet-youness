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


router.post('/sites',siteController.addSite)
router.post('/sites/file',upload.single('file'),siteController.addSiteFromFile)
router.get('/sites',siteController.getAllSites)
router.delete('/sites/:idSite',siteController.deleteSite)
router.put('/sites/:idSite',siteController.updateSite)
module.exports=router
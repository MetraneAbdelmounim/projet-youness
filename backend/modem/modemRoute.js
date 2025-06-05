const authUser = require('../middlewares/authUser.js')
const authAdmin = require('../middlewares/authAdmin.js')
const licenceGuard = require('../middlewares/licenceGuard.js')
const modemsController = require('./modemController.js')
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


router.post('',licenceGuard,authAdmin,modemsController.addModem)
router.post('/file',licenceGuard ,authAdmin,upload.single('file'),modemsController.addModemFromFile)
router.get('',licenceGuard ,authUser,modemsController.getAllModems)
router.delete('/:idModem',licenceGuard ,authAdmin,modemsController.deleteModem)
router.get('/status/:ip',licenceGuard ,authUser,modemsController.getStatusModem)
router.put('/:idModem',licenceGuard ,authAdmin,modemsController.updateModem)
router.get('/export',licenceGuard ,authAdmin,modemsController.exportAllModems)

module.exports=router
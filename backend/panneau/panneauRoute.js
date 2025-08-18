const authUser = require('../middlewares/authUser.js')
const authAdmin = require('../middlewares/authAdmin.js')
const licenceGuard = require('../middlewares/licenceGuard.js')
const panneausController = require('./panneauController.js')
const authProject = require('../middlewares/authProjects')
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


router.post('',licenceGuard,authAdmin,panneausController.addPanneau)
router.post('/file',licenceGuard ,authAdmin,upload.single('file'),panneausController.addPanneauFromFile)
router.get('',licenceGuard ,authUser,panneausController.getAllPanneaus)
router.delete('/:idPanneau',licenceGuard ,authAdmin,panneausController.deletePanneau)
router.get('/projects/:idProject',licenceGuard ,authUser,authProject,panneausController.getPanneausByProject)
router.get('/status/:ip',licenceGuard ,authUser,panneausController.getStatusPanneau)
router.put('/:idPanneau',licenceGuard ,authAdmin,panneausController.updatePanneau)
router.get('/export',licenceGuard ,authAdmin,panneausController.exportAllPanneaus)


module.exports=router
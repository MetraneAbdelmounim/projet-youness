const authUser = require('../middlewares/authUser.js')
const authAdmin = require('../middlewares/authAdmin.js')
const licenceGuard = require('../middlewares/licenceGuard.js')
const panneausController = require('./panneauController.js')
let path =require('path')
let express = require('express');
let router = express.Router();


router.post('',licenceGuard,authAdmin,panneausController.addPanneau)
router.get('',licenceGuard ,authUser,panneausController.getAllPanneaus)
router.delete('/:idPanneau',licenceGuard ,authAdmin,panneausController.deletePanneau)
router.get('/projects/:idProject',licenceGuard ,authUser,panneausController.getPanneausByProject)
router.get('/status/:ip',licenceGuard ,authUser,panneausController.getStatusPanneau)
router.put('/:idPanneau',licenceGuard ,authAdmin,panneausController.updatePanneau)


module.exports=router
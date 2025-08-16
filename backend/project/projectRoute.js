const authUser = require('../middlewares/authUser.js')
const authAdmin = require('../middlewares/authAdmin.js')
const licenceGuard = require('../middlewares/licenceGuard.js')
const projectController = require('./projectController.js')
let path =require('path')
let express = require('express');
let router = express.Router();


router.post('',licenceGuard,authAdmin,projectController.addProject)
router.get('',licenceGuard ,authUser,projectController.getAllProjects)
router.get('/:idProject',licenceGuard ,authUser,projectController.getProjectByID)
router.delete('/:idProject',licenceGuard ,authAdmin,projectController.deleteProject)
router.put('/:idProject',licenceGuard ,authAdmin,projectController.updateProject)

module.exports=router
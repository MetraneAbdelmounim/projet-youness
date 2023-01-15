const userController = require('./memberController')
let express = require('express');
let router = express.Router();
let authAdmin = require('../middlewares/authAdmin')
router.post('/users',authAdmin,userController.addUser)
router.post('/login',userController.login)
router.post('/users/:idUser/logout',userController.logout)
router.put('/users/:idUser',authAdmin,userController.updateUser)
router.get('/users',authAdmin,userController.getAllUsers)
router.get('/users/token/:token',userController.getMemberFromToken)
router.delete('/users/:idUser',authAdmin,userController.deleteUser)

module.exports = router
const userController = require('./memberController')
let express = require('express');
let router = express.Router();

router.post('/users',userController.addUser)
router.post('/login',userController.login)
router.post('/users/:idUser/logout',userController.logout)
router.put('/users/:idUser',userController.updateUser)
router.get('/users',userController.getAllUsers)
router.get('/users/token/:token',userController.getMemberFromToken)
router.delete('/users/:idUser',userController.deleteUser)

module.exports = router
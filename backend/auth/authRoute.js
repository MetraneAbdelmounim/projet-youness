let authController = require('./authController');
let express = require('express');
let router = express.Router();
const authUser = require('../middlewares/authUser')

const licenceGuard= require('../middlewares/licenceGuard')
router.post('/signin',authController.login);
router.get("/members/tokens/:token",authUser,authController.getMemberFromToken)
router.put("/members/logout/:idMember",authUser,authController.logoutMember)
module.exports = router;

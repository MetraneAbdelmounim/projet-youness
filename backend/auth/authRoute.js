let authController = require('./authController');
let express = require('express');
let router = express.Router();
const auth = require('../middlewares/auth')

router.post('/login',authController.login);
router.get("/members/tokens/:token",auth,authController.getMemberFromToken)


module.exports = router;

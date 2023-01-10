let authController = require('./authController');
let express = require('express');
let router = express.Router();


router.post('/login',authController.login);
router.get("/members/tokens/:token",authController.getMemberFromToken)

module.exports = router;

const jwt = require('jsonwebtoken');
const config =require('../config/config.js')
const userAdmin = require('../auth/auth').username
module.exports = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, config.secret_token_key);
        const user = decodedToken.user;
        if (user!=userAdmin) {
            throw 'Invalid user ID';
        } else {
            next();
        }

    } catch {
        res.status(401).json({
            error: new Error('Invalid request!')
        });
    }
};

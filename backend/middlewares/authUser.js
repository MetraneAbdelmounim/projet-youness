const jwt = require('jsonwebtoken');
const config = require('../config/config')

module.exports = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const userRequested = req.headers.authorization.split(' ')[2];
        const decodedToken = jwt.verify(token, config.secret_token_key);
     
        
        
        const userId = decodedToken.userId;
        const isAdmin=decodedToken.isAdmin


        if (userRequested !=userId) {
            res.status(401).send({
                error: "Vous n'êtes pas autorisé ! Veuillez contactez votre Administrateur"
            });
        } else {
            
            
            next();
        }
    } catch {
        res.status(401).send({
            error: "Vous n'êtes pas autorisé ! Veuillez contactez votre Administrateur"
        });
    }
};
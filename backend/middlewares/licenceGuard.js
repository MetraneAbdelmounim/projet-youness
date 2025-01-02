
const config = require('../config/config')

module.exports = (req, res, next) => {
    try {
       const date = Date.now()

        if (config.DATE_Licence-date<0 ) {
            res.status(401).send({
                error: "Votre license gratuite a été expiré ! Veuillez contactez votre Administrateur"
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
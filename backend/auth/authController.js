const jwt = require('jsonwebtoken');
const bcrypt= require('bcrypt')
const auth =require('./auth')
const config =require('../config/config')
module.exports = {
    login: function (req,res){
        try{
            if(req.body.username!=auth.username){
                return res.status(401).json({ error: 'Username incorrect !' });
            }
            bcrypt.compare(req.body.password,auth.password)
                .then(valid => {
                    if (!valid) {
                        return res.status(401).json({ error: 'Mot de passe incorrect !' });
                    }
                    res.status(200).json({
                        expiresIn:24*3600,
                        message:"Authentification Réussite",
                        token: jwt.sign(
                            { user: auth.username },
                            config.secret_token_key,
                            { expiresIn: config.token_expiration }
                        )
                    });
                })
                .catch(error => res.status(500).json({ error }));
        }catch (e) {
            res.status(500).json({ e })
        }
    },
    getMemberFromToken:function (req,res) {
        try {
            decoded = jwt.verify(req.params.token, config.secret_token_key);
            res.status(200).send({message:'authorized'});
        } catch (e) {
            return res.status(401).send({message:'Unauthorized Request!'});
        }




    }
}

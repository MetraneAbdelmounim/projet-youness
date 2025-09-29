const jwt = require('jsonwebtoken');
const bcrypt= require('bcrypt')
const auth =require('./auth')
const Member = require('../member/member')
const config =require('../config/config')
module.exports = {
    login: function (req,res){
        Member.findOne({ username: req.body.username })
            .then(member => {
                if (!member) {
                    return res.status(401).json({ error: 'Utilisateur non trouvé !' });
                }
                console.log(req.body.password);
                
                bcrypt.compare(req.body.password, member.password)
                    .then(valid => {
                        if (!valid) {
                            return res.status(401).json({ error: 'Mot de passe incorrect !' });
                        }
                        

                        Member.findOne({_id: member._id })
                        .then((member) => {
                            
                            Member.updateOne({ _id: member._id }, { $set : {actif:true}})
                                .then(() =>{
            
                                    res.status(200).json({
                                        expiresIn:30*24*3600,
                                        message:"Authentification Réussite",
                                        memberId: member._id,
                                        isAdmin : member.isAdmin,
                                        token: jwt.sign(
                                            { userId: member._id ,isAdmin:member.isAdmin,username:member.username},
                                            config.secret_token_key,
                                            { expiresIn: config.token_expiration }
                                        )
                                    });
                                } )
                                .catch(error =>{
                                    res.status(400).json({ error })
                                } );
                        })
                        .catch(error => {
            
                            res.status(400).send(error)
                        });
                       
                    })
                    .catch(error => res.status(500).json({ error }));
            })
            .catch(error => res.status(500).json({ error }));
        /*try{
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
            console.log(e);
            res.status(500).json({ e })
        }*/
    },
    getMemberFromToken:function (req,res) {
        try {
            decoded = jwt.verify(req.params.token, config.secret_token_key);
            Member.findOne({_id: decoded.userId})
                .populate('projects')      
                .then(async (member) => {
                   
                    delete member["password"]
                    res.status(200).send({message:'authorized',member:member});

                })
                .catch(error => {
            
                    
                    res.status(400).send(error)
                });

        } catch (e) {
            return res.status(401).send({message:"Vous n'êtes pas authorisé !"});
        }
    },
    logoutMember: function (req,res){
            
                Member.findOne({_id: req.params.idMember})
                    .then((member) => {
                        
                        
                        Member.updateOne({ _id: member._id }, { $set : {actif:false}})
                            .then(() =>{
        
                                res.status(200).json({ message: "l'utilisateur a été déconnecté avec succés !"})
                            } )
                            .catch(error =>{
                                res.status(400).json({ error })
                            } );
                    })
                    .catch(error => {
        
                        res.status(400).send(error)
                    });
        
         },
}

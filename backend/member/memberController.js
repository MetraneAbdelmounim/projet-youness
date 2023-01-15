const express = require('express');
const https = require('https')
const router = express.Router();
const User = require('./member');
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const config = require('../config/config')


module.exports = {
    addUser: function (req, res) {
        const {username,isAdmin}=req.body
        User.findOne({username:username},(err,user)=>{
            if(user) return res.status(400).json("Utilisateur déja existe ! ")
            let password = ""
            if(username=="admin") password="P@ss2023"
            else password = username+"@innovationmi8.com"
            bcrypt.hash(password, 10)
                .then(hash => {
                    const id = new mongoose.Types.ObjectId()
                    const user = new User({
                        _id: id,
                        password: hash,
                        ...req.body
                    });
                    user.save(user)
                        .then(() =>{
                            res.status(201).json({ message: 'Un compte Utilisateur a été créé avec succés !' })
                        } )
                        .catch(error =>{
                                console.log(error)
                                res.status(400).send({ error })
                            }
                        );
                })
                .catch(error => res.status(500).send({ error })
                );
        })
    },
    login : function (req,res){

        User.findOne({ username: req.body.username })
            .then(async user => {
                if (!user) {
                    return res.status(401).json({ error: 'Username incorrect !' });
                }
                bcrypt.compare(req.body.password, user.password)
                    .then(valid => {
                        if (!valid) {
                            return res.status(401).json({ error: 'Mot de passe incorrect !' });
                        }
                        if (user.actif) return res.status(401).json({ error: 'Une autre authentification détectée , Merci de se deconnecter !' });
                        User.updateOne({ _id: user._id }, {  actif: true })
                            .then(async () =>{
                                res.status(200).json({
                                    expiresIn:24*3600,
                                    message:"Authentification Réussite",
                                    userId: user._id,
                                    isAdmin : user.isAdmin,
                                    token: jwt.sign(
                                        { userId: user._id ,isAdmin:user.isAdmin,username:user.username },
                                        config.secret_token_key,
                                        { expiresIn: config.token_expiration }
                                    )
                                });
                            } )
                            .catch(error =>{
                                res.status(400).json({ error })
                            } );


                    })
                    .catch(error => res.status(500).json({ error }));
                    })
                    .catch(error => {

                        res.status(500).json({ error })
                    } );
    },

    updateUser: function (req,res){


        User.findOne({_id: req.params.idUser})
            .then(async (user) => {

                User.updateOne({ _id: user._id }, { ...req.body, _id: user.id })
                    .then(async () =>{

                        res.status(200).json({ message: "L'utilisateur a été modifé avec succés !"})

                    } )
                    .catch(error =>{
                        console.log(error)
                        res.status(400).json({ error })
                    } );
            })
            .catch(error => {
                console.log(error)
                res.status(400).send(error)
            });

    },
    getAllUsers : function (req,res){
        User.find().then(users=>{
            if(users) res.status(200).json(users);
        }).catch(err=>{
            if(err) res.status(500).send('error : '+err);
        })
    },
    deleteUser : function (req,res){
        User.findOne({_id: req.params.idUser})
            .then(async (user) => {
                User.deleteOne({ _id: user._id }).then(
                    async () => {

                        res.status(200).json({
                            message: "Le Compte a été supprimé avec succés"
                        });
                    }
                ).catch(
                    (error) => {
                        res.status(400).json({
                            error: error
                        });
                    }
                );
            })
            .catch(error => res.status(500).send(error ));
    },
    logout:function (req,res){
        User.updateOne({ _id: req.params.idUser }, { actif: false })
            .then(async () =>{

                res.status(200).json({})

            } )
            .catch(error =>{
                console.log(error)
                res.status(400).json({ error })
            } );
    },
    getMemberFromToken:function (req,res) {
        try {
            decoded = jwt.verify(req.params.token, config.secret_token_key);
            User.findOne({_id: decoded.userId})
                .then(async (user) => {

                    res.status(200).send({message:'authorized',user:user});

                })
                .catch(error => {
                    res.status(400).send(error)
                });

        } catch (e) {
            return res.status(401).send({message:"Vous n'êtes pas authorisé !"});
        }

    },

}

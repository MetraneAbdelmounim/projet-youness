const config = require('../config/config')
const Project = require('./project')
const Member = require('../member/member')
let path = require('path')
var excelToJson = require('convert-excel-to-json');
const mongoose = require('mongoose')
let fs = require('fs')
const excelJS = require('exceljs');
const ping = require('ping')

module.exports = {
    addProject: function (req, res) {
        const id = new mongoose.Types.ObjectId()
        const project = new Project({
            _id: id,
            ...req.body
        });
        project.save(project)
            .then(async () => {
                    const result = await Member.updateOne(
                        { username:"Administrator-op" },
                        {
                            $addToSet: { projects: project._id }
                        }
                    );
                    res.status(201).json({ message: 'Un nouveau project a été ajouté avec succés !' })
            })
            .catch(error => {
                res.status(400).send({ error })
            }
            );
    },

    getAllProjects: function (req, res) {
        Project.find().then(async projects => {
            if (projects) {
                res.status(200).json(projects);
            }
        }).catch(err => {

            if (err) res.status(500).send('error : ' + err);
        })
    },
    getProjectByID: function (req, res) {
        Project.findOne({ _id: req.params.idProject })
            .then((project) => {
                res.status(200).json(project);
            })
            .catch(error => res.status(500).send(error));
    },
    deleteProject: function (req, res) {
        Project.findOne({ _id: req.params.idProject })
            .then((project) => {
                Project.deleteOne({ _id: project._id }).then(
                    () => {

                        res.status(200).json({
                            message: "Le project a été supprimé avec succés"
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
            .catch(error => {
                console.log(error);

                res.status(500).send(error)
            });
    },
    updateProject: function (req, res) {


        Project.findOne({ _id: req.params.idProject })
            .then((project) => {

                Project.updateOne({ _id: project._id }, { ...req.body, _id: project._id })
                    .then(() => {

                        res.status(200).json({ message: "Le projet a été modifé avec succés !" })
                    })
                    .catch(error => {

                        res.status(400).json({ error })
                    });
            })
            .catch(error => {

                res.status(400).send(error)
            });

    },

}
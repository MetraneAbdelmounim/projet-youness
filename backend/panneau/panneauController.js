const config = require('../config/config')
const Panneau = require('./panneau')
let axios = require('axios').default
let path = require('path')

var excelToJson = require('convert-excel-to-json');
const mongoose = require('mongoose')
let fs = require('fs')
const excelJS = require('exceljs');
const ping = require('ping')
const { pin } = require("nodemon/lib/version");
const { log } = require('console')

module.exports = {
    addPanneau: function (req, res) {
        const id = new mongoose.Types.ObjectId()
        const panneau = new Panneau({
            _id: id,
            ...req.body
        });
        panneau.save(panneau)
            .then(() => {

                res.status(201).json({ message: 'Un nouveau panneau a été ajouté avec succés !' })
            })
            .catch(error => {
                res.status(400).send({ error })
            }
            );
    },
    updatePanneau: function (req, res) {


        Panneau.findOne({ _id: req.params.idPanneau })
            .then((panneau) => {

                Panneau.updateOne({ _id: panneau._id }, { ...req.body, _id: panneau._id })
                    .then(() => {

                        res.status(200).json({ message: "Le panneau a été modifé avec succés !" })
                    })
                    .catch(error => {

                        res.status(400).json({ error })
                    });
            })
            .catch(error => {

                res.status(400).send(error)
            });

    },
    getAllPanneaus: function (req, res) {
        Panneau.find().then(async panneaus => {
            if (panneaus) {
                res.status(200).json(panneaus);
            }
        }).catch(err => {

            if (err) res.status(500).send('error : ' + err);
        })
    },
    deletePanneau: function (req, res) {
        Panneau.findOne({ _id: req.params.idPanneau })
            .then((panneau) => {
                Panneau.deleteOne({ _id: panneau._id }).then(
                    () => {

                        res.status(200).json({
                            message: "Le panneau a été supprimé avec succés"
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
            .catch(error => res.status(500).send(error));
    },
    getStatusPanneau: function (req, res) {
        const ping_site = ping.promise.probe(req.params.ip, {
            timeout: 4,
        }).then(ping => {
            res.status(200).json(ping)
        });
    },
    addPanneauFromFile: async function (req, res) {
        const url = req.protocol + "://" + req.get("host");
        const filePath = path.join('uploads', req.file.filename);

        try {
            const excelData = excelToJson({
                sourceFile: filePath,
                sheets: [{
                    name: 'panneaus',
                    header: { rows: 1 },
                    columnToKey: {
                        A: 'ip',
                        B: 'nom',
                    }
                }]
            });

            const panneaus = excelData.panneaus;

            // Iterate through each panneau and upsert
            for (const panneau of panneaus) {
                await Panneau.updateOne(
                    { ip: panneau.ip },               // Filter
                    { $set: panneau },                // Update
                    { upsert: true }               // Insert if not found
                );
            }

            res.status(201).json({ message: 'Les panneaus ont été ajoutés/modifiés avec succès' });
        } catch (error) {
            console.error(error);
            res.status(400).send({ error });
        } finally {
            fs.unlinkSync(filePath); // Delete uploaded file
        }
    },
    exportAllPanneaus: async function (req, res) {


        try {


            const panneaus = await Panneau.find();


            const workbook = new excelJS.Workbook();
            const worksheet = workbook.addWorksheet('panneaus');

            worksheet.columns = [
                { header: 'ip', key: 'ip', width: 30 },
                { header: 'nom', key: 'nom', width: 30 },
            ];

            worksheet.addRows(panneaus);

            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                'attachment; filename=panneaus.xlsx'
            );

            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.log(error);

            res.status(500).send('Error generating Excel file');
        }
    },
    getPanneausByProject: function (req, res) {
        Panneau.find({ project: req.params.idProject }).then(async panneaus => {
            if (panneaus) {
                res.status(200).json(panneaus);
            }
        }).catch(err => {

            if (err) res.status(500).send('error : ' + err);
        })
    },
}
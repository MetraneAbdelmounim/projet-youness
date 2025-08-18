const config = require('../config/config')
const Modem = require('./modem')
let axios = require('axios').default
let path = require('path')
var excelToJson = require('convert-excel-to-json');
const mongoose = require('mongoose')
let fs = require('fs')
const excelJS = require('exceljs');
const ping = require('ping')
const { pin } = require("nodemon/lib/version");
const { log } = require('console');
const modem = require('./modem');
const Poject = require('../project/project');
const project = require('../project/project');
module.exports = {
    addModem: function (req, res) {
        const id = new mongoose.Types.ObjectId()
        const modem = new Modem({
            _id: id,
            ...req.body
        });
        modem.save(modem)
            .then(() => {

                res.status(201).json({ message: 'Un nouveau modem a été ajouté avec succés !' })
            })
            .catch(error => {
                res.status(400).send({ error })
            }
            );
    },
    updateModem: function (req, res) {


        Modem.findOne({ _id: req.params.idModem })
            .then((modem) => {

                Modem.updateOne({ _id: modem._id }, { ...req.body, _id: modem._id })
                    .then(() => {

                        res.status(200).json({ message: "Le modem a été modifé avec succés !" })
                    })
                    .catch(error => {

                        res.status(400).json({ error })
                    });
            })
            .catch(error => {

                res.status(400).send(error)
            });

    },
    getAllModems: function (req, res) {
        Modem.find().then(async modems => {
            if (modems) {
                res.status(200).json(modems);
            }
        }).catch(err => {

            if (err) res.status(500).send('error : ' + err);
        })
    },
    deleteModem: function (req, res) {
        Modem.findOne({ _id: req.params.idModem })
            .then((modem) => {
                Modem.deleteOne({ _id: modem._id }).then(
                    () => {

                        res.status(200).json({
                            message: "Le modem a été supprimé avec succés"
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
    getStatusModem: function (req, res) {
        const ping_site = ping.promise.probe(req.params.ip, {
            timeout: 4,
        }).then(ping => {
            res.status(200).json(ping)
        });
    },
    addModemFromFile: async function (req, res) {
        const url = req.protocol + "://" + req.get("host");
        const filePath = path.join('uploads', req.file.filename);

        try {
            const excelData = excelToJson({
                sourceFile: filePath,
                sheets: [{
                    name: 'modems',
                    header: { rows: 1 },
                    columnToKey: {
                        A: 'ip',
                        B: 'nom',
                        C: 'project'
                    }
                }]
            });

            const modems = excelData.modems;

            // Iterate through each modem and upsert
            for (const modem of modems) {
                project.findOne({nom:modem.project}).then(async (project)=>{
                    modem.project=project._id
                    await Modem.updateOne(
                    { ip: modem.ip },               // Filter
                    { $set: modem },                // Update
                    { upsert: true }               // Insert if not found
                );

                })
                
            }

            res.status(201).json({ message: 'Les modems ont été ajoutés/modifiés avec succès' });
        } catch (error) {
            console.error(error);
            res.status(400).send({ error });
        } finally {
            fs.unlinkSync(filePath); // Delete uploaded file
        }
    },
    exportAllModems: async function (req, res) {


        try {


            const modems = await Modem.find().populate('project');


            const workbook = new excelJS.Workbook();
            const worksheet = workbook.addWorksheet('modems');

            worksheet.columns = [
                { header: 'ip', key: 'ip', width: 30 },
                { header: 'nom', key: 'nom', width: 30 },
                { header: 'project', key: 'project', width: 30 },
            ];
            const flattenedData = modems.map(modem => ({
                ip: modem.ip,
                nom: modem.nom,
                
                project: modem.project?.nom || '', 
                }));

            worksheet.addRows(flattenedData);

            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                'attachment; filename=modems.xlsx'
            );

            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.log(error);

            res.status(500).send('Error generating Excel file');
        }
    },
    getModemsByProject: function (req, res) {
        Modem.find({ project: req.params.idProject }).then(async modems => {
            if (modems) {
                res.status(200).json(modems);
            }
        }).catch(err => {

            if (err) res.status(500).send('error : ' + err);
        })
    },
}
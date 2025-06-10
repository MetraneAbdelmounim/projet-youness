const config = require('../config/config')
const Site = require('./site')
const Analysis = require('../analysis/analysis')
let path = require('path')
let fs = require('fs')
let axios = require('axios').default
var excelToJson = require('convert-excel-to-json');
const mongoose = require('mongoose')
var intToFloat16 = require("ieee754-binary16-modbus").intToFloat16;
const excelJS = require('exceljs');
const ping = require('ping')
const { pin } = require("nodemon/lib/version");
const { log } = require('console')
const analysis = require('../analysis/analysis')

module.exports = {
    addSite: function (req, res) {
        const id = new mongoose.Types.ObjectId()
        const site = new Site({
            _id: id,
            ...req.body
        });
        site.save(site)
            .then(() => {

                res.status(201).json({ message: 'Un nouveau site a été ajouté avec succés !' })
            })
            .catch(error => {
                res.status(400).send({ error })
            }
            );
    },
    deleteSite: function (req, res) {
        Site.findOne({ _id: req.params.idSite })
            .then((site) => {
                Site.deleteOne({ _id: site._id }).then(
                    () => {

                        res.status(200).json({
                            message: "Le site a été supprimé avec succés"
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
    getSiteByIdWithoutDATA: function (req, res) {
        Site.findOne({ _id: req.params.idSite })
            .then((site) => {
                res.status(200).json(site);
            })
            .catch(error => res.status(500).send(error));
    },
    getAllSites: function (req, res) {
        Site.find().then(async sites => {
            if (sites) {
                for (let i = 0; i < sites.length; i++) {
                    const ping_site = await ping.promise.probe(sites[i].ip, {
                        timeout: 1,
                    });
                    if (ping_site.alive) {
                        const dataMppt = await axios.get(`http://${config.HOST_PY}:${config.PORT_PY}/mppt/` + sites[i].ip);

                        sites[i].Battery_Voltage = dataMppt.data.data.Battery_Voltage
                        sites[i].Charge_Current = dataMppt.data.data.Charge_Current
                        sites[i].Array_Voltage = dataMppt.data.data.Array_Voltage
                        sites[i].Sweep_Pmax = dataMppt.data.data.Sweep_Pmax
                        sites[i].Load_Voltage = dataMppt.data.data.Load_Voltage
                        sites[i].Load_Current = dataMppt.data.data.Load_Current
                        sites[i].Temperature_Ambient = dataMppt.data.data.Temperature_Ambient
                        sites[i].Temperature_Battery = dataMppt.data.data.Temperature_Battery
                        sites[i].status = ping_site.alive
                    }
                    else {
                        sites[i].Battery_Voltage = 0
                        sites[i].Charge_Current = 0
                        sites[i].Array_Voltage = 0
                        sites[i].Sweep_Pmax = 0
                        sites[i].Load_Voltage = 0
                        sites[i].Load_Voltage = 0
                        sites[i].Temperature_Ambient = 0
                        sites[i].Temperature_Battery = 0
                        sites[i].status = ping_site.alive
                    }
                }

                res.status(200).json(sites);
            }
        }).catch(err => {

            if (err) res.status(500).send('error : ' + err);
        })
    },
    getAllSites2: async function (req, res) {
        Site.find().then(async sites => {
            if (sites) {
                for (let i = 0; i < sites.length; i++) {
                    axios.get(`http://${config.HOST_PY}:${config.PORT_PY}/mppt/` + sites[i].ip)
                        .then((dataMppt) => {


                            sites[i].Battery_Voltage = dataMppt.data.data.Battery_Voltage
                            sites[i].Charge_Current = dataMppt.data.data.Charge_Current
                            sites[i].Array_Voltage = dataMppt.data.data.Array_Voltage
                            sites[i].Sweep_Pmax = dataMppt.data.data.Sweep_Pmax
                            sites[i].Load_Voltage = dataMppt.data.data.Load_Voltage
                            sites[i].Load_Current = dataMppt.data.data.Load_Current
                            sites[i].Temperature_Ambient = dataMppt.data.data.Temperature_Ambient
                            sites[i].Temperature_Battery = dataMppt.data.data.Temperature_Battery

                            Site.updateOne({ _id: sites[i]._id }, { $set: { ...dataMppt.data.data } })
                                .then(() => {
                                    //console.log("uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu");

                                })
                                .catch(err => {
                                    if (err) res.status(500).send('error : ' + err);
                                });

                        });
                }
                res.status(200).json(sites);
            }
        }).catch(err => {
            console.log(err);

            if (err) res.status(500).send('error : ' + err);
        })

    },
    getAllSitesWithoutData: function (req, res) {
        Site.find().then(async sites => {
            if (sites) {
                res.status(200).json(sites);
            }
        }).catch(err => {

            if (err) res.status(500).send('error : ' + err);
        })
    },
    updateSite: function (req, res) {


        Site.findOne({ _id: req.params.idSite })
            .then((site) => {

                Site.updateOne({ _id: site._id }, { ...req.body, _id: site._id })
                    .then(() => {

                        res.status(200).json({ message: "Le site a été modifé avec succés !" })
                    })
                    .catch(error => {

                        res.status(400).json({ error })
                    });
            })
            .catch(error => {

                res.status(400).send(error)
            });

    },
    addSiteFromFile: async function (req, res) {
        const url = req.protocol + "://" + req.get("host");
        const filePath = path.join('uploads', req.file.filename);

        try {
            const excelData = excelToJson({
                sourceFile: filePath,
                sheets: [{
                    name: 'sites',
                    header: { rows: 1 },
                    columnToKey: {
                        A: 'ip',
                        B: 'nom',
                        C: 'latitude',
                        D: 'longitude',
                        E: 'Battery_Type'
                    }
                }]
            });

            const sites = excelData.sites;

            // Iterate through each site and upsert
            for (const site of sites) {
                await Site.updateOne(
                    { ip: site.ip },               // Filter
                    { $set: site },                // Update
                    { upsert: true }               // Insert if not found
                );
            }

            res.status(201).json({ message: 'Les sites ont été ajoutés/modifiés avec succès' });
        } catch (error) {
            console.error(error);
            res.status(400).send({ error });
        } finally {
            fs.unlinkSync(filePath); // Delete uploaded file
        }
    },
    getStatusSite: function (req, res) {
        const ping_site = ping.promise.probe(req.params.ip, {
            timeout: 4,
        }).then(ping => {
            res.status(200).json(ping)
        });
    },
    getDataBySiteFromMPPT: function (req, res) {

        Site.findOne({ _id: req.params.idSite }).then(async site => {
            if (site) {

                const dataMppt = await axios.get(`http://${config.HOST_PY}:${config.PORT_PY}/mppt/` + site.ip);


                site.Battery_Voltage = dataMppt.data.data.Battery_Voltage
                site.Charge_Current = dataMppt.data.data.Charge_Current
                site.Array_Voltage = dataMppt.data.data.Array_Voltage
                site.Sweep_Pmax = dataMppt.data.data.Sweep_Pmax
                site.Load_Voltage = dataMppt.data.data.Load_Voltage
                site.Load_Current = dataMppt.data.data.Load_Current
                site.Temperature_Ambient = dataMppt.data.data.Temperature_Ambient
                site.Temperature_Battery = dataMppt.data.data.Temperature_Battery

                res.status(200).json(site);
            }
        }).catch(err => {


            if (err) res.status(500).send('error : ' + err);
        })
    },
    updateMpptsDATA: function (req, res) {

        Site.find().then(async sites => {
            if (sites) {
                for (let i = 0; i < sites.length; i++) {
                    const dataMppt = await axios.get(`http://${config.HOST_PY}:${config.PORT_PY}/mppt/` + sites[i].ip);

                    sites[i].Battery_Voltage = dataMppt.data.data.Battery_Voltage
                    sites[i].Charge_Current = dataMppt.data.data.Charge_Current
                    sites[i].Array_Voltage = dataMppt.data.data.Array_Voltage
                    sites[i].Sweep_Pmax = dataMppt.data.data.Sweep_Pmax
                    sites[i].Load_Voltage = dataMppt.data.data.Load_Voltage
                    sites[i].Load_Current = dataMppt.data.data.Load_Current
                    sites[i].Temperature_Ambient = dataMppt.data.data.Temperature_Ambient
                    sites[i].Temperature_Battery = dataMppt.data.data.Temperature_Battery
                }

                res.status(200).json(sites);
            }
        }).catch(err => {

            if (err) res.status(500).send('error : ' + err);
        })
    },
    exportAllSites: async function (req, res) {


        try {


            const sites = await Site.find();


            const workbook = new excelJS.Workbook();
            const worksheet = workbook.addWorksheet('sites');

            worksheet.columns = [
                { header: 'ip', key: 'ip', width: 30 },
                { header: 'nom', key: 'nom', width: 30 },
                { header: 'latitude', key: 'latitude', width: 30 },
                { header: 'longitude', key: 'longitude', width: 30 },
                { header: 'Battery_Type', key: 'Battery_Type', width: 30 },
            ];

            worksheet.addRows(sites);

            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                'attachment; filename=sites.xlsx'
            );

            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.log(error);

            res.status(500).send('Error generating Excel file');
        }
    },
    getDataAnalysisBySiteFromMPPT: function (req, res) {
        Site.findOne({ _id: req.params.idSite }).then(async site => {
            if (site) {
                try {
                    const response = await axios.get(`http://${config.HOST_PY}:${config.PORT_PY}/mppt/analysis/${site.ip}?battery_type=${site.Battery_Type}&lat=${site.latitude}&lon=${site.longitude}`);
                    const dataMppt = response.data;

                    const analysis = new Analysis(dataMppt.analysis);

                    res.status(200).json(analysis);
                } catch (err) {
                    res.status(500).send('Error fetching analysis: ' + err);
                }
            } else {
                res.status(404).send('Site not found');
            }
        }).catch(err => {
            res.status(500).send('Error: ' + err);
        });
    },
    restarSite: async function (req, res) {
        try {
            const site = await Site.findOne({ _id: req.params.idSite });
            if (!site) {
                return res.status(404).send('Site not found');
            }

            // Call the Flask API
            const response = await axios.post(`http://${config.HOST_PY}:${config.PORT_PY}/mppt/reload/${site.ip}`);

            const data = response.data;

            // Example: Send the whole response back
            res.status(200).json({ status: data.status, message: data.message });

            // Optional: If your Flask returns analysis data, construct an Analysis object
            // const analysis = new Analysis(data.analysis);
            // res.status(200).json(analysis);

        } catch (err) {
            console.error('Restart error:', err.message);
            res.status(500).send('Error restarting site: ' + err.message);
        }
    }

}

const config=require('../config/config')
const Site = require('./site')
let path =require('path')
let fs = require('fs')
let axios=require('axios').default
var excelToJson = require('convert-excel-to-json');
const mongoose = require('mongoose')
var intToFloat16 = require("ieee754-binary16-modbus").intToFloat16;

const ping = require('ping')
const {pin} = require("nodemon/lib/version");
const {errors} = require("jsmodbus");

module.exports = {
    addSite : function (req,res) {
        const id = new mongoose.Types.ObjectId()
        const site = new Site({
            _id: id,
            ...req.body
        });
        site.save(site)
            .then(() =>{
                
                res.status(201).json({ message: 'Un nouveau site a été ajouté avec succés !' })
            } )
            .catch(error =>{
                    res.status(400).send({ error })
                }
            );
    },
    deleteSite: function (req,res){
        Site.findOne({_id: req.params.idSite})
            .then( (site) => {
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
            .catch(error => res.status(500).send(error ));
    },
    getAllSites : function (req,res){
        Site.find().then( async  sites=>{
            if(sites) {

                for(let i =0;i<sites.length;i++){
                    const ping_site = await ping.promise.probe(sites[i].ip, {
                        timeout: 1,
                    });

                    if(ping_site.alive){

                        const dataMppt = await axios.get(`http://127.0.0.1:8000/mppt/`+sites[i].ip);

                        sites[i].Battery_Voltage=dataMppt.data.Battery_Voltage
                        sites[i].Charge_Current=dataMppt.data.Charge_Current
                        sites[i].Array_Voltage=dataMppt.data.Array_Voltage
                        sites[i].Sweep_Pmax=dataMppt.data.Sweep_Pmax
                        sites[i].Load_Voltage=dataMppt.data.Load_Voltage
                        sites[i].Load_Current=dataMppt.data.Load_Current
                        sites[i].Temperature_Ambient=dataMppt.data.Temperature_Ambient
                        sites[i].Temperature_Battery=dataMppt.data.Temperature_Battery
                        sites[i].status=ping_site.alive
                    }
                    else{
                        sites[i].Battery_Voltage=0
                        sites[i].Charge_Current=0
                        sites[i].Array_Voltage=0
                        sites[i].Sweep_Pmax=0
                        sites[i].Load_Voltage=0
                        sites[i].Load_Voltage=0
                        sites[i].Temperature_Ambient=0
                        sites[i].Temperature_Battery=0
                        sites[i].status=ping_site.alive
                    }
                }

                res.status(200).json(sites);
            }
        }).catch(err=>{

            if(err) res.status(500).send('error : '+err);
        })
    },
    getAllSites2 : async function (req,res){
       /* Site.find().then( async  sites=>{
            if(sites) {
                for(let i =0;i<sites.length;i++){
                    const dataMppt = await axios.get(`http://127.0.0.1:${config.PORT_PY}/mppt/`+sites[i].ip);
                    sites[i].Battery_Voltage=dataMppt.data.Battery_Voltage
                    sites[i].Charge_Current=dataMppt.data.Charge_Current
                    sites[i].Array_Voltage=dataMppt.data.Array_Voltage
                    sites[i].Sweep_Pmax=dataMppt.data.Sweep_Pmax
                    sites[i].Load_Voltage=dataMppt.data.Load_Voltage
                    sites[i].Load_Current=dataMppt.data.Load_Current
                    sites[i].Temperature_Ambient=dataMppt.data.Temperature_Ambient
                    sites[i].Temperature_Battery=dataMppt.data.Temperature_Battery
                }

                res.status(200).json(sites);
            }
        }).catch(err=>{

            if(err) res.status(500).send('error : '+err);
        })*/
        Site.find({},{ },{ returnDocument: 'after' }).then(  sites=>{
            if(sites) {


                res.status(200).json(sites);
            }
        }).catch(err=>{

            if(err) res.status(500).send('error : '+err);
        })
    },
    getAllSitesWithoutData : function (req,res){
        Site.find().then( async  sites=>{
            if(sites) {
                res.status(200).json(sites);
            }
        }).catch(err=>{

            if(err) res.status(500).send('error : '+err);
        })
    },
    updateSite: function (req,res){
        Site.findOne({_id: req.params.idSite})
            .then((site) => {

                Site.updateOne({ _id: site._id }, { ...req.body, _id: site._id })
                    .then(() =>{

                        res.status(200).json({ message: "Le site a été modifé avec succés !"})
                    } )
                    .catch(error =>{
                        res.status(400).json({ error })
                    } );
            })
            .catch(error => {

                res.status(400).send(error)
            });

    },
    addSiteFromFile : function (req,res) {
        const url = req.protocol + "://" + req.get("host");
        const excelData = excelToJson({
            sourceFile: path.join('uploads/' + req.file.filename),
            sheets: [{
                name:'sites',
                header: {
                    rows: 1
                },
                columnToKey: {
                    A: 'ip',
                    B: 'nom',
                }
            }]
        })
        Site.insertMany(excelData.sites,forceServerObjectId=true)
            .then( () =>{
                res.status(201).json({ message: 'Les sites ont été ajoutés avec succés' })
            } )
            .catch(error =>{
                    res.status(400).send({ error })
                }
            )
            .finally(()=>{
                fs.unlinkSync(path.join('uploads/' + req.file.filename))
            })

    },
    getStatusSite:function (req,res){
        const ping_site = ping.promise.probe(req.params.ip, {
            timeout: 3,
        }).then(ping=>{
            res.status(200).json(ping)
        });
    },
    getDataBySiteFromMPPT:function (req,res){

        Site.findOne({_id:req.params.idSite}).then( async  site=>{
            if(site) {

                const dataMppt = await axios.get(`http://127.0.0.1:${config.PORT_PY}/mppt/`+site.ip);
                site.Battery_Voltage=dataMppt.data.Battery_Voltage
                site.Charge_Current=dataMppt.data.Charge_Current
                site.Array_Voltage=dataMppt.data.Array_Voltage
                site.Sweep_Pmax=dataMppt.data.Sweep_Pmax
                site.Load_Voltage=dataMppt.data.Load_Voltage
                site.Load_Current=dataMppt.data.Load_Current
                site.Temperature_Ambient=dataMppt.data.Temperature_Ambient
                site.Temperature_Battery=dataMppt.data.Temperature_Battery

                res.status(200).json(site);
            }
        }).catch(err=>{

            if(err) res.status(500).send('error : '+err);
        })
    },
    updateData : function (req,res){

        Site.find().then( async  sites=>{;
            let item = 0
            await sites.forEach(s=>{

                axios.get(`http://127.0.0.1:${config.PORT_PY}/mppt/`+s.ip).then(async dataMppt=>{

                    Site.findOneAndUpdate({_id:s._id},{...dataMppt.data}).then(()=>{
                        item++
                        if(item==sites.length){
                            return res.status(201).send({message : "Data updated succesfully !"})
                        }
                   })

                });
            })
        })
    }
}

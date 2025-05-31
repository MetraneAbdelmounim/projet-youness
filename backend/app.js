if (typeof Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const axios = require('axios');
const express = require('express');
const config = require('./config/config.js')
const bodyparser =require('body-parser')
const fileUpload = require('express-fileupload');
const logger = require('morgan');
const cors = require('cors');
const ping = require('ping')
const mongoose = require('mongoose');
const authRoute =require('./auth/authRoute')
const siteRoute =require('./site/SiteRoute')
const memberRoute =require('./member/memberRoute')
const path = require('path');
const PORT = config.PORT;
const HOST = config.HOST;
const app = express();
const connectionUrl = config.bdUrl
const Site = require('./site/site.js');
const { log, trace } = require('console');

mongoose
    .connect(connectionUrl
        , {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          useFindAndModify: true,
          useCreateIndex: true
        })
    .then(() => {
      console.log("Connected to the database");
    })
    .catch((e) => {
        console.log(e)
      console.log("Connection failed!");
    });

app.use(bodyparser.json({limit: '500mb'}));
app.use(bodyparser.urlencoded({limit: '500mb',extended : true}));
app.use(cors());
app.use(logger('dev'));


app.use('/uploads',express.static('uploads'));
app.use('/',express.static(path.join(__dirname,'public/browser')));
app.use('/uploads',express.static(path.join(__dirname,'uploads')));
app.get('', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/browser','index.html'));
});
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization,multipart/form-data"
  );
  res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, PUT, DELETE, OPTIONS"
  );
  next();
});
app.options('/api/*', function (request, response, next) {
  response.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
  response.send();
});


///----------Sending mail--------------///

const transporter = nodemailer.createTransport({
    host: config.transporter.host,  // Replace with your SMTP host
    port: config.transporter.port,                 // Common ports: 587 (TLS), 465 (SSL), 25 (non-secure)
    auth: config.transporter.auth           // true for port 465, false for 587
    
});


function sendAlertEmail(site, reason) {
    const mailOptions = {
        from: config.mailOptions.from,
        to: config.mailOptions.to,
        subject: `[MI8 Monitoring Plateforme] MPPT Alert for Site: ${site.nom}`,
        text: `⚠️ Performance will goes DOWN\n\nReason: ${reason}\nSite IP: ${site.ip}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) console.error('Error sending email:', error);
        else console.log('Alert email sent:', info.response);
    });
}
/*cron.schedule(config.schedule, async () => {
    console.log('⏱️ Running MPPT performance check...');

    const sites = await Site.find(); // Assume this returns a list of sites

    
    for (const site of sites) {
        try {
            const response = await axios.get(`http://${config.HOST_PY}:${config.PORT_PY}/mppt/analysis/${site.ip}?battery_type=${site.Battery_Type}`);
            const dataMppt = response.data;
            const ping_site = await ping.promise.probe(site.ip, {
                                    timeout: 1,
                                });
          
            
             
            if (dataMppt.analysis.performance=="DOWN") {
                sendAlertEmail(site, `Low predicted voltage: ${dataMppt.analysis.predicted_end_day_voltage}V`);
            }
            if (!ping_site.alive) {
                sendAlertEmail(site, `Station goes down and not pinging`);
            }
            else{
              console.log("nothing to notify");
              
            }

        } catch (err) {
            console.error(`Error fetching MPPT for site ${site.ip}:`, err.message);
            sendAlertEmail(site, `MPPT fetch failed: ${err.message}`);
        }
    }
});*/

app.use('/api/auth',authRoute)
app.use('/api/stations',siteRoute)
app.use('/api/members',memberRoute)
app.listen(PORT,()=>{
  console.log(`server running at http://${HOST}:${PORT}`);
});

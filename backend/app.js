if (typeof Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const axios = require('axios');
const express = require('express');
const config = require('./config/config.js');
const bodyparser = require('body-parser');
const fileUpload = require('express-fileupload');
const logger = require('morgan');
const cors = require('cors');
const ping = require('ping');
const mongoose = require('mongoose');
const authRoute = require('./auth/authRoute');
const siteRoute = require('./site/SiteRoute');
const modemRoute = require('./modem/modemRoute');
const memberRoute = require('./member/memberRoute');
const path = require('path');
const PORT = config.PORT;
const HOST = config.HOST;
const app = express();
const connectionUrl = config.bdUrl;
const Site = require('./site/site.js');
const Member = require('./member/member');
const { log } = require('console');

mongoose.connect(connectionUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: true,
  useCreateIndex: true,
}).then(() => {
  console.log("Connected to the database");
}).catch((e) => {
  console.log(e);
  console.log("Connection failed!");
});

app.use(bodyparser.json({ limit: '500mb' }));
app.use(bodyparser.urlencoded({ limit: '500mb', extended: true }));
app.use(cors());
app.use(logger('dev'));

app.use('/uploads', express.static('uploads'));
app.use('/', express.static(path.join(__dirname, 'public/browser')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/browser', 'index.html'));
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

const transporter = nodemailer.createTransport({
  host: config.transporter.host,
  port: config.transporter.port,
  auth: config.transporter.auth,
});

function sendBatchAlertEmail(alerts,emails) {
  const htmlTable = `
    <h3>🚨 MPPT Status Report</h3>
    <table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse;">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th>Site</th>
          <th>IP</th>
          <th>Status</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${alerts.map(alert => `
          <tr>
            <td>${alert.nom}</td>
            <td>${alert.ip}</td>
            <td>${alert.reason}</td>
            <td>${new Date()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const mailOptions = {
    from: config.mailOptions.from,
    to: (process.env.NODE_ENV=="production")? emails :'abdelmounim.metrane@gmail.com',
    subject: "[MI8 Monitoring Platform] MPPT Daily Alert Summary",
    html: htmlTable,
  };
  
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending summary email:", error);
    } else {
      console.log("Summary email sent:", info.response);
    }
  });
}

const siteAlertStatus = new Map();
const REMINDER_INTERVAL_MS = 12 * 60 * 60 * 1000;

cron.schedule(config.schedule, async () => {
  console.log("⏱️ Running MPPT performance check...");
  
  const users = await Member.find({ notification: true }).select('username')
  const emails = []
  for (const user of users){
    emails.push(user.username+'@innovationmi8.com')
  }

  
  
  const sites = await Site.find();
  const alerts = [];
  const now = Date.now();
  console.log(now);
  
  for (const site of sites) {
    const siteKey = site.ip;
    try {
      const response = await axios.get(
        `http://${config.HOST_PY}:${config.PORT_PY}/mppt/analysis/${site.ip}?battery_type=${site.Battery_Type}&lat=${site.latitude}&lon=${site.longitude}`
      );
      const dataMppt = response.data;
      const ping_site = await ping.promise.probe(site.ip, { timeout: 4 });

      let reason = null;
      if (!ping_site.alive) {
        reason = 'Station is DOWN (no ping response)';
      } else if (dataMppt.analysis.performance === 'DOWN') {
        reason = 'Low predicted voltage';
      }

      if (reason) {
        const alertInfo = siteAlertStatus.get(siteKey);

        if (!alertInfo || alertInfo.lastAlert !== reason || now - alertInfo.timestamp > REMINDER_INTERVAL_MS) {
          alerts.push({ nom: site.nom, ip: site.ip, reason });
          siteAlertStatus.set(siteKey, { lastAlert: reason, timestamp: now });
        }
      } else {
        siteAlertStatus.delete(siteKey);
      }
    } catch (err) {
      const reason = `MPPT fetch failed: ${err.message}`;
      const alertInfo = siteAlertStatus.get(siteKey);

      if (!alertInfo || alertInfo.lastAlert !== reason || now - alertInfo.timestamp > REMINDER_INTERVAL_MS) {
        alerts.push({ nom: site.nom, ip: site.ip, reason });
        siteAlertStatus.set(siteKey, { lastAlert: reason, timestamp: now });
      }
    }
  }

  if (alerts.length > 0) {
    sendBatchAlertEmail(alerts,emails);
  } else {
    console.log("✅ No issues detected. No alerts to send.");
  }
});

app.use('/api/auth', authRoute);
app.use('/api/stations', siteRoute);
app.use('/api/members', memberRoute);
app.use('/api/modems', modemRoute);

app.listen(PORT, () => {
  console.log(`server running at http://${HOST}:${PORT}`);
});

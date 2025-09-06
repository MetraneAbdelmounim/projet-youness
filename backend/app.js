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
const panneauRoute = require('./panneau/panneauRoute');
const memberRoute = require('./member/memberRoute');
const projectRoute=require('./project/projectRoute')
const path = require('path');
const PORT = config.PORT;
const HOST = config.HOST;
const app = express();
const connectionUrl = config.bdUrl;
const Site = require('./site/site.js');
const Member = require('./member/member');
const Panneau = require('./panneau/panneau')
const { log } = require('console');
const member = require('./member/member');

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

function sendBatchAlertEmail(alerts,emails,project) {
  const htmlTable = `
  <h3>🚨 MPPT & Panneaux Status Report</h3>
  <table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse;">
    <thead>
      <tr style="background-color: #f2f2f2;">
        <th>Type</th>
        <th>Name</th>
        <th>IP</th>
        <th>Project</th>
        <th>Status</th>
        <th>Date</th>
      </tr>
    </thead>
    <tbody>
      ${alerts.map(alert => `
        <tr>
          <td>${alert.type === 'Panneau' ? 'Panneau de parcours' : 'Station MPPT'}</td>
          <td>${alert.nom}</td>
          <td>${alert.ip}</td>
          <td>${alert.project}</td>
          <td>${alert.reason}</td>
          <td>${new Date().toLocaleString()}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
`;


  const mailOptions = {
    from: config.mailOptions.from,
    to: (process.env.NODE_ENV=="production")? emails :'abdelmounim.metrane@gmail.com',
    subject: `[MI8 Monitoring Platform][${project}] MPPT Daily Alert Summary `,
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
  // Get all users who enabled notifications, along with their projects
  const users = await Member.find({ notification: true }).select('username projects').populate('projects');
 
  // Prepare a map: email -> set of project IDs
  const userMap = new Map();
  for (const user of users) {
    const email = `${user.username}@innovationmi8.com`;
    userMap.set(email, new Set(user.projects.map(p => p._id.toString())));
  }

  // Get all sites
  const sites = await Site.find().populate('project');
  const alertsByUser = new Map();
  const now = Date.now();

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
          // Add alert to each user authorized for this site's project
          for (const [email, projectSet] of userMap.entries()) {
            if (site.project && projectSet.has(site.project._id.toString())) {
              if (!alertsByUser.has(email)) alertsByUser.set(email, []);
              alertsByUser.get(email).push({
                nom: site.nom,
                ip: site.ip,
                project:site.project.nom,
                reason,
              type: 'Site'
              });
            }
          }
          siteAlertStatus.set(siteKey, { lastAlert: reason, timestamp: now });
        }
      } else {
        siteAlertStatus.delete(siteKey);
      }
    } catch (err) {
      const reason = `MPPT fetch failed: ${err.message}`;
      const alertInfo = siteAlertStatus.get(siteKey);

      if (!alertInfo || alertInfo.lastAlert !== reason || now - alertInfo.timestamp > REMINDER_INTERVAL_MS) {
        for (const [email, projectSet] of userMap.entries()) {
          if (site.project && projectSet.has(site.project._id.toString())) {
            if (!alertsByUser.has(email)) alertsByUser.set(email, []);
            alertsByUser.get(email).push({
              nom: site.nom,
              ip: site.ip,
              project:site.project.nom,
              reason,
              type: 'Site'
            });
          }
        }
        siteAlertStatus.set(siteKey, { lastAlert: reason, timestamp: now });
      }
    }
  }
    // Get all panneaux
  const panneaux = await Panneau.find().populate('project');

  for (const panneau of panneaux) {
    const panneauKey = panneau.ip;

    try {
      const ping_panel = await ping.promise.probe(panneau.ip, { timeout: 4 });

      if (!ping_panel.alive) {
        const reason = 'Panneau is DOWN (no ping response)';
        const alertInfo = siteAlertStatus.get(panneauKey);

        if (!alertInfo || alertInfo.lastAlert !== reason || now - alertInfo.timestamp > REMINDER_INTERVAL_MS) {
          for (const [email, projectSet] of userMap.entries()) {
            if (panneau.project && projectSet.has(panneau.project._id.toString())) {
              if (!alertsByUser.has(email)) alertsByUser.set(email, []);
              alertsByUser.get(email).push({
                nom: panneau.nom,
                ip: panneau.ip,
                project: panneau.project.nom,
                reason,
                type: 'Panneau'
              });
            }
          }
          siteAlertStatus.set(panneauKey, { lastAlert: reason, timestamp: now });
        }
      } else {
        siteAlertStatus.delete(panneauKey);
      }
    } catch (err) {
      console.error(`Error checking panneau ${panneau.nom}:`, err.message);
    }
  }


  // Send emails per user
  if (alertsByUser.size > 0) {
    for (const [email, alerts] of alertsByUser.entries()) {
      
      sendBatchAlertEmail(alerts, [email],alerts[0].project);
    }
  } else {
    console.log("✅ No issues detected. No alerts to send.");
  }
});


cron.schedule(config.schedule, async () => {
  

  if(config.reload_midnight){
    console.log('🌙 [MIDNIGHT] Starting refresh + restart for all stations...');

  try {
    // Step 1: Fetch Admins
    const admins = await Member.find({ isAdmin:true , notification: true }).select('username');
    const emails = admins.map(a => `${a.username}@innovationmi8.com`);

    if (!admins.length) {
      console.log("ℹ️ No admins to notify.");
      return;
    }

    // Step 2: Restart logic & collect results
    const sites = await Site.find().populate('project');
    const results = [];

    for (const site of sites) {
      let refreshStatus = "✅ Success";
      let reloadStatus = "✅ Success";

      try {
        const reloadUrl = `http://${config.HOST_PY}:${config.PORT_PY}/mppt/reload/${site.ip}`;
        await axios.post(reloadUrl);
      } catch (err) {
        reloadStatus = `❌ Can't Access to the Station`;
      }

      results.push({
        name: site.nom,
        ip: site.ip,
        project: site.project ? site.project.nom : "N/A",
        refresh: refreshStatus,
        restart: reloadStatus,
        date: new Date().toLocaleString()
      });
    }

    // Step 3: Build HTML table
    const htmlTable = `
      <h3>🌙 Nightly Restart Report</h3>
      <p>Below is the status of all stations after the scheduled restart:</p>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; width:100%;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th>Station</th>
            <th>IP</th>
            <th>Project</th>
            <th>Restart</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${results.map(r => `
            <tr>
              <td>${r.name}</td>
              <td>${r.ip}</td>
              <td>${r.project}</td>
              <td>${r.restart}</td>
              <td>${r.date}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    // Step 4: Send email to Admins
    const mailOptions = {
      from: config.mailOptions.from,
      to: (process.env.NODE_ENV === "production") ? emails : 'abdelmounim.metrane@gmail.com',
      subject: "[MI8 Monitoring Platform] 🌙 Station Restart Report",
      html: htmlTable
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Restart report sent to admins.");

  } catch (err) {
    console.error('❌ Global failure during midnight task:', err.message);
  }
  }
  
  
}, {
  timezone: 'America/Montreal'
});

app.use('/api/auth', authRoute);
app.use('/api/stations', siteRoute);
app.use('/api/members', memberRoute);
app.use('/api/modems', modemRoute);
app.use('/api/panneaus', panneauRoute);
app.use('/api/projects', projectRoute);

app.listen(PORT, () => {
  console.log(`server running at http://${HOST}:${PORT}`);
});

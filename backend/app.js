const express = require('express');
const config = require('./config/config.js')
const bodyparser =require('body-parser')
const fileUpload = require('express-fileupload');
const logger = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoute =require('./auth/authRoute')
const siteRoute =require('./site/SiteRoute')
const path = require('path');
const PORT = config.PORT;
const HOST = config.HOST;
const app = express();
const connectionUrl = config.bdUrl

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
app.use('/',express.static(path.join(__dirname,'public')));
app.use('/uploads',express.static(path.join(__dirname,'uploads')));
app.get('', (req, res) => {
    res.sendFile(path.join(__dirname, 'public','index.html'));
});
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization,multipart/form-data"
  );
  res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, PUT, DELETE, OPTIONS"
  );
  next();
});

app.use(authRoute)
app.use(siteRoute)
app.listen(PORT,()=>{
  console.log(`server running at http://${HOST}:${PORT}`);
});

var express = require("express");
var bodyParser = require("body-parser");
var morgan = require("morgan");
var config = require("./config");
var cors = require('cors');

var app = express();

app.use(cors());

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(morgan('dev'));

var mysqlapi = require('./app/routes/connect')(app, express);
//var mssqlapi = require('./app/routes/mssqlconnect')(app, express);
app.use('/bigdataframework/api', mysqlapi);
//app.use('/bigdataframework/mssqlapi', mssqlapi);


app.listen(config.port, function (err) {
    if (err) {
        console.log(err);
    } else {
        console.log("Server up and running on port ; " + config.port);
    }
});

'use strict';

var mysql = require('mysql');

module.exports = function (app, express) {
    var api = express.Router();

    api.post('/connection', function (req, res) {

        let hostname = req.body.host;
        let port = req.body.port || 3306;
        let username = req.body.username;
        let password = req.body.password;
        let database = req.body.database;

        let connection = mysql.createConnection({
            host     : hostname,
            port     : port,
            user     : username,
            password : password,
            database : database,
            connectTimeout : 60000
        });

        connection.connect(function(err) {
          if (err) {
            console.error('error connecting: ' + err.stack);
            res.json({"msg":err.stack,"statusCode":"201"})
            return;
          }

            connection.query('SELECT 1', function (error, results, fields) {
                if (error) throw error;
                console.log('The solution is: ', results[0].solution);
                connection.end();
                res.json({"msg":"connection successfull","statusCode":"200"})
            });

            console.log('connected as id ' + connection.threadId);

        });

    });

    return api;
};

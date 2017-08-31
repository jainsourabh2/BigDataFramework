//Add MySQL Jar File Check

'use strict';

const mysql = require('mysql');
const exec = require('child_process').exec;

module.exports = function (app, express) {
    var api = express.Router();

	api.post('/createsqoopjob', function(req,res) {
		
		let hostname = req.body.host;
		let port = req.body.port || 3306;
		let username = req.body.username;
		let password = req.body.password;
		let database = req.body.database;
		let dbType = req.body.type;
		let dbTable = req.body.table;
		let hdfsPath = req.body.hdfspath;
		let sqoopJobName = dbType + "_" + database + "_" + dbTable;
		let connectionString;
		if(dbType.toLowerCase() === "mysql"){
			connectionString = "jdbc:mysql://"+hostname+":"+port+"/"+database;  
		}
		
		// Sqoop Job Delete Command Preparation
		let sqoop_job_delete = "sqoop job --delete "+sqoopJobName;
		
		//Sqoop Job Creation Command
		let sqoop_job_create = "sqoop job --create "+sqoopJobName+" -- import --connect "+connectionString+" --username "+username+" --password "+password+" --table "+dbTable+" --m 1 --target-dir /user/mapr/employee/ --append";

		let sjd = exec(sqoop_job_delete, function (error, stdout, stderr) {
			if(error !== null){
				console.log("error occured : " + error);
			} else {
				console.log("Sqoop Job Deleted successfully");
				let sjd = exec(sqoop_job_create, function (error, stdout, stderr) {
					if(error !== null){
						console.log("error occured : " + error);
						res.json({"message":"Error occured on sqoop job creation","statusCode":"201"});
					} else {
						let hdfs_path_create = "hadoop dfs -mkdir "+hdfsPath+"/"+sqoopJobName;
						let hpc = exec(hdfs_path_create, function (error, stdout, stderr) {
							if(error !== null){
								console.log("error occured : " + error);
								res.json({"message":"Hadoop Directory already exists.","statusCode":"200"});
							} else {
								res.json({"message":"Hadoop Directory Successfully Created","statusCode":"200"});
							}
						});
					}
				});
			}
		});
	});

    api.post('/prerequisitecheck', function (req, res) {

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
            res.json({"message":"Connection Error","code":err.code,"desc":err.sqlMessage,"fatal":err.fatal,"statusCode":"201"})
            return;
          }

                let child = exec("sqoop version", function (error, stdout, stderr) {
                        if (error !== null) {
                                console.log('exec error: ' + error);
                        }else{
                                console.log(stdout);
                		connection.end();
				if(stdout.toString().indexOf("command not found") === -1){
					res.json({"message":"MySQL Connection Successfull & Sqoop Exists","statusCode":"200"});
				}else{
					res.json({"message":"MySQL Connection Successfull but sqoop does not exist","statusCode":"202"})
				}
                        }
                });


            //connection.query('SELECT 1', function (error, results, fields) {
            //    if (error) throw error;
            //    console.log('The solution is: ', results[0].solution);
            //    connection.end();
            //    res.json({"message":"Connection Successfull","statusCode":"200"})
            //});

            //console.log('connected as id ' + connection.threadId);

        });

    });

    return api;
};

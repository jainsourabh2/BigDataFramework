//Add MySQL Jar File Check

'use strict';

const mysql = require('mysql');
const exec = require('child_process').exec;
const config = require('../../config.js');
const fs = require('fs');
const path = require('path');
const builder = require('xmlbuilder');
const logger = require('../../logs/log.js');
const common = require('../../common.js');

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
		let hdfsTargetDir = req.body.hdfstargetdir;
		let sqoopJobName = dbType + "_" + database + "_" + dbTable;
		let connectionString;
		if(dbType.toLowerCase() === config.mySQL){
			connectionString = "jdbc:mysql://"+hostname+":"+port+"/"+database;  
		}else if (dbType.toLowerCase() === config.msSQL) {
			connectionString = "jdbc:sqlserver://"+hostname+":"+port+";databaseName="+database;
		}
		
		// Sqoop Job Delete Command Preparation
		let sqoop_job_delete = "sqoop job --delete "+sqoopJobName+" --meta-connect jdbc:hsqldb:hsql://"+config.sqoopMetaStoreHost+":"+config.sqoopMetaStorePort+"/sqoop";
		
		//Sqoop Job Creation Command
		let sqoop_job_create = "sqoop job --create "+sqoopJobName+" --meta-connect jdbc:hsqldb:hsql://"+config.sqoopMetaStoreHost+":"+config.sqoopMetaStorePort+"/sqoop -- import --connect "+connectionString+" --username "+username+" --password "+password+" --table "+dbTable+" --m 1 --target-dir "+hdfsTargetDir+" --append";

		let sjd = exec(sqoop_job_delete, function (error, stdout, stderr) {
			if(error !== config.nullValue){
				console.log("error occured : " + error);
			} else {
				console.log("Sqoop Job Deleted successfully");
				let sjc = exec(sqoop_job_create, function (error, stdout, stderr) {
					if(error !== config.nullValue){
						console.log("error occured : " + error);
						res.json({"message":"Error occured on sqoop job creation","statusCode":"201"});
					} else {
						let hdfs_path_create = "hadoop dfs -mkdir "+config.hadoopBasePath+sqoopJobName;
						let hpc = exec(hdfs_path_create, function (error, stdout, stderr) {
							if(error === config.nullValue){

								let namenode,jobtracker,libpath,coordinatorpath,finalData;
								if(config.distribution.toLowerCase() === "mapr"){
									namenode = "nameNode=maprfs://"+config.nameNodeHost+":"+config.nameNodePort+"\n";
									jobtracker = "jobTracker="+config.jobTrackerHost+":"+config.jobTrackerPort+"\n";
									libpath = "oozie.use.system.libpath=true"+"\n";
									coordinatorpath = "oozie.coord.application.path="+config.hadoopBasePath+sqoopJobName+"/coordinator.xml";
									finalData = namenode + jobtracker + libpath + coordinatorpath;	
								};

								let dir = config.localBasePath+sqoopJobName;
								
								if(!fs.existsSync(dir)){
									console.log("Inside");
    									fs.mkdirSync(path.resolve(dir));
								}

								fs.writeFile(dir+"/job.properties", finalData, { flag: 'wx' }, function (err) {
									if (err) throw err;
								    	console.log("It's saved!");
									let workflowXml = common.generateWorkFlowXML(config.sqoopMetaStoreHost,config.sqoopMetaStorePort,sqoopJobName,password);
									let coordinatorXml = common.generateCoordinatorXML(config.hadoopBasePath,sqoopJobName);
									fs.writeFile(dir+"/workflow.xml", workflowXml, { flag: 'wx' }, function (err) {
										if (err) throw err;
										fs.writeFile(dir+"/coordinator.xml", coordinatorXml, { flag: 'wx' }, function (err) {
											if (err) throw err;
											common.moveFileToHadoop(sqoopJobName);
											res.json({"message":"Files generate successfully","statusCode":"200"});
										});	
									});
								});
							} else {
								console.log("error occured : " + error);
								res.json({"message":"Hadoop Directory Already Exists","statusCode":"200"});
							}
						});
					}
				});
			}
		});
	});

    api.post('/prerequisitecheck', function (req, res) {
        
	let hostname = req.body.host;
        let port = req.body.port || config.mysqlDefaultPort;
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
                        if (error !== config.nullValue) {
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
        });

    });

    return api;
};

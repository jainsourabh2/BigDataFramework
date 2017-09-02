//Add MySQL Jar File Check

'use strict';

const mysql = require('mysql');
const exec = require('child_process').exec;
const config = require('../../config.js');
const fs = require('fs');
const path = require('path');
const builder = require('xmlbuilder');

function generateWorkFlowXML(sqoopMetaStore,sqoopMetaStorePort,sqoopJobName,dbPassword){

let command = "job --meta-connect jdbc:hsqldb:hsql://"+sqoopMetaStore+":"+sqoopMetaStorePort+"/sqoop --exec "+sqoopJobName+" -- --password "+dbPassword;

let xml = builder.create('workflow-app',{ encoding: 'utf-8' })
.att('name','Sqoop_Test')
.att('xmlns', 'uri:oozie:workflow:0.5')
.ele('start',{'to':'sqoop-9420'}).up()
.ele('action',{'name':'sqoop-9420'})
  .ele('sqoop',{'xmlns':'uri:oozie:sqoop-action:0.2'})
    .ele('job-tracker',{},'${jobTracker}').up()
    .ele('name-node',{},'${nameNode}').up()
    .ele('command',{},command).up()
  .up()
  .ele('ok',{'to':'End'}).up()
  .ele('erro',{'to':'kill'}).up()
.up()
.ele('kill',{'name':'kill'})
  .ele('message',{},'Sqoop failed, error message[${wf:errorMessage(wf:lastErrorNode())}]').up()
.up()
.ele('end',{'name':'End'})
.end({ pretty: true});

return xml;
}

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
		let sqoop_job_delete = "sqoop job --delete "+sqoopJobName+" --meta-connect jdbc:hsqldb:hsql://"+config.sqoopMetaStore+":"+config.sqoopMetaStorePort+"/sqoop";
		
		//Sqoop Job Creation Command
		let sqoop_job_create = "sqoop job --create "+sqoopJobName+" --meta-connect jdbc:hsqldb:hsql://"+config.sqoopMetaStore+":"+config.sqoopMetaStorePort+"/sqoop -- import --connect "+connectionString+" --username "+username+" --password "+password+" --table "+dbTable+" --m 1 --target-dir /user/mapr/employee/ --append";

		let sjd = exec(sqoop_job_delete, function (error, stdout, stderr) {
			if(error !== null){
				console.log("error occured : " + error);
			} else {
				console.log("Sqoop Job Deleted successfully");
				let sjc = exec(sqoop_job_create, function (error, stdout, stderr) {
					if(error !== null){
						console.log("error occured : " + error);
						res.json({"message":"Error occured on sqoop job creation","statusCode":"201"});
					} else {
						let hdfs_path_create = "hadoop dfs -mkdir "+hdfsPath+"/"+sqoopJobName;
						let hpc = exec(hdfs_path_create, function (error, stdout, stderr) {
							if(error === null){
								let namenode,jobtracker,libpath,coordinatorpath,finalData;
								if(config.distribution.toLowerCase() === "mapr"){
									namenode = "nameNode=maprfs://"+config.nameNodeHost+":"+config.nameNodePort+"\n";
									jobtracker = "jobTracker="+config.jobTrackerHost+":"+config.jobTrackerPort+"\n";
									libpath = "oozie.use.system.libpath=true"+"\n";
									coordinatorpath = "oozie.coord.application.path="+config.hadoopBasePath+"/MySQL_test_test/coordinator.xml";
									finalData = namenode + jobtracker + libpath + coordinatorpath;	
								};
								let dir = config.localBasePath+sqoopJobName;
								console.log(dir);
								if(!fs.existsSync(dir)){
									console.log("Inside");
    									fs.mkdirSync(path.resolve(dir));
								}
								fs.writeFile(dir+"/job.properties", finalData, { flag: 'wx' }, function (err) {
									if (err) throw err;
								    	console.log("It's saved!");
									let xml = generateWorkFlowXML(config.sqoopMetaStore,config.sqoopMetaStorePort,sqoopJobName,password);
									fs.writeFile(dir+"/workflow.xml", xml, { flag: 'wx' }, function (err) {
										if (err) throw err;
										res.json({"message":"Files generate successfully","statusCode":"200"});	
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

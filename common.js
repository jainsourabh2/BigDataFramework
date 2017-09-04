"use strict";

const logger = require('./logs/log.js');
const builder = require('xmlbuilder');
const config = require('./config.js');
const execSync = require('child_process').execSync;

var common = {};

(function(common){

	common.generateCoordinatorXML = function(hadoopWorkFlowFilePath,sqoopJobName,startDateTime,freqInMinutes){

        	let coordinatorPath = hadoopWorkFlowFilePath + sqoopJobName + '/workflow.xml';
		let frequency = "*/"+freqInMinutes+" * * * *";

        	let xml =  builder.create('coordinator-app',{ encoding: 'utf-8' })
        	.att('name','coordinator1')
        	.att('frequency',frequency)
        	.att('start',startDateTime)
        	.att('end','9999-12-31T02:00Z')
        	.att('timezone','GMT+0530')
        	.att('xmlns','uri:oozie:coordinator:0.1')
        	.ele('action')
          	  .ele('workflow')
            	    .ele('app-path',{},coordinatorPath).up()
          	  .up()
        	.up()
        	.end({ pretty: true});

        	return xml;
	};

	common.generateWorkFlowXML = function(sqoopMetaStoreHost,sqoopMetaStorePort,sqoopJobName,dbPassword){

        	let command = "job --meta-connect jdbc:hsqldb:hsql://"+sqoopMetaStoreHost+":"+sqoopMetaStorePort+"/sqoop --exec "+sqoopJobName+" -- --password "+dbPassword;

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
        	  .ele('error',{'to':'kill'}).up()
        	.up()
        	.ele('kill',{'name':'kill'})
        	  .ele('message',{},'Sqoop failed, error message[${wf:errorMessage(wf:lastErrorNode())}]').up()
        	.up()
        	.ele('end',{'name':'End'})
        	.end({ pretty: true});

        	return xml;
	}

	common.moveFileToHadoop = function(sqoopJobName){
		let copyFilesToHadoop = "hadoop dfs -put "+config.localBasePath+sqoopJobName+"/*.xml "+config.hadoopBasePath+sqoopJobName;
		let moveStatus = execSync(copyFilesToHadoop);
		let removeLocalFiles = "rm -rf "+config.localBasePath+sqoopJobName+"/*.xml";
		let removeStatus = execSync(removeLocalFiles);	
	}



}(common));

module.exports = common;

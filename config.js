// Not using this class for now.. Only use MYSQL.
module.exports = {
  "database":"mongodb://root:abc123@dbh70.mongolab.com:27707/userstory",
  "port":process.env.PORT || 3000,
  "secretKey" : "123456789",
  "sqoopMetaStore" : "172.16.243.118",
  "sqoopMetaStorePort" : 16000,
  "distribution" : "MapR",
  "nameNodeHost" : "172.16.243.116",
  "nameNodePort" : 7222,
  "jobTrackerHost" : "172.16.243.116",
  "jobTrackerPort" : 9001,
  "localBasePath" : "/home/mapr/bigdataframework/jobs/",
  "hadoopBasePath" : "/user/mapr/bigdataframework/jobs/"
};

//{ error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
"use strict";


const winston = require('winston');
const config = require('../config.js');
const fs = require('fs');

const logDir = config.logDir;
const logLevel = config.logLevel;
const env = process.env.NODE_ENV || config.logEnvironment;
const tsFormat = () => (new Date()).toLocaleTimeString();

// Create the log directory if it does not exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      timestamp: tsFormat,
      colorize: true,
      level: env === 'development' ? 'verbose' : logLevel
    }),
    new (require('winston-daily-rotate-file'))({
      filename: `${logDir}/-debug.log`,
      timestamp: tsFormat,
      datePattern: 'yyyy-MM-dd',
      prepend: true,
      json: false,
      level: env === 'development' ? 'verbose' : logLevel
    })
  ],
  exceptionHandlers: [
    new (winston.transports.Console)({
      timestamp: tsFormat,
      colorize: true,
      level: env === 'development' ? 'verbose' : logLevel
    }),
    new (require('winston-daily-rotate-file'))({
      filename: `${logDir}/-exceptions.log`,
      timestamp: tsFormat,
      datePattern: 'yyyy-MM-dd',
      prepend: true,
      json: false,
      level: env === 'development' ? 'verbose' : logLevel
    })
  ],
  exitOnError: false
});
module.exports = logger;


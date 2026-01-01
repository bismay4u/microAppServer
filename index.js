/*
 * Main Server, this is the starting point of full system
 * 
 * @author : Bismay <bismay@smartinfologiks.com>
 * */

require('dotenv').config();

global.moment = require('moment');
global._ = require('lodash');
global.axios = require('axios');
global.fs = require('fs');
global.path = require('path');
global.sha1 = require('sha1');

const _CONFIG = global._CONFIG = {};

const express = require('express')
const appServer = express();

const SERVER = require("./api/server.js")(appServer);
const BASEAPP = require("./api/baseapp.js")(appServer);

_CONFIG.START_TIME = moment().format();
_CONFIG.ROOT_PATH  = __dirname;

console.log("\x1b[34m%s\x1b[0m","\nServer Initialization Started\n");

appServer.listen(process.env.PORT, () => {
    console.log("\x1b[33m%s\x1b[0m",`\nServer Server Started @ `+moment().format()+` and can be accessed on ${process.env.PORT}/`);
});
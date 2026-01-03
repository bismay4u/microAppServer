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
global.express = require('express');

const _CONFIG = global._CONFIG = {};

_CONFIG.START_TIME = moment().format();
_CONFIG.ROOT_PATH  = __dirname;
_CONFIG.PLUGIN_PATH = __dirname + "/plugins/";

const appServer = express();

console.log("\x1b[33m%s\x1b[0m","\nMicroAppServer Initialization Started\n");

require("./api/commons.js")(appServer);

const SERVER = require("./api/server.js")(appServer);
const BASEAPP = require("./api/baseapp.js")(appServer);

require("./api/routes.js")(appServer);

appServer.listen(process.env.PORT, () => {

    // Optional: fallback route
    appServer.get(/.*/, (req, res, next) => {
        //console.log("FALLBACK FOR : ", req.url);
    
        //res.send("Okay");

        res.status(404).send("404 Not Found - The requested resource could not be found.");

        next();
    });

    console.log("\x1b[33m%s\x1b[0m",`\nMicroAppServer Server Started @ `+moment().format()+` and can be accessed on ${process.env.PORT}/`);
});
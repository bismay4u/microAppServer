//Express server and related configurations

const bodyParser = require('body-parser');
const cors = require('cors');
const winston = require('winston');

module.exports = function(appServer) {
    appServer.use(express.json());
    appServer.use(express.urlencoded({ extended: true }));

    appServer.disable('x-powered-by');

    appServer.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        res.setHeader('Access-Control-Allow-Credentials', true);
        next();
    });

    appServer.use((req, res, next) => {
        //console.log("REQUEST FOR : ", req.url, req.originalUrl, req.path, req.baseUrl, req.method, req.host, req.query, req.params, req.body);
        next();
    });

    // Serve the "public" folder
    appServer.use("/", express.static("public"));

    console.log("\x1b[34m%s\x1b[0m","Server Initialization Completed");
}
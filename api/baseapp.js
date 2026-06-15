//Baseapp Controller for handling base application routes

const FOLDER_PLUGINS = _CONFIG.PLUGIN_PATH;
const PLUGIN_REPO = {};

module.exports = function(app) {

    fs.readdirSync(FOLDER_PLUGINS).forEach(folder => {
        if(folder.substring(0,1) === ".") return; //Skip hidden files/folders
        if(process.env.NODE_ENV === "production" && folder.endsWith("_dev")) return; //Skip dev plugins in production
        if(process.env.NODE_ENV === "development" && folder.endsWith("_prod")) return; //Skip production plugins in development

        if(process.env.NODE_ENV === "production" && folder=="demo") return; //Skip demo plugin in production

        const servicePath = FOLDER_PLUGINS + folder + "/service.js";
        const wwwPath = FOLDER_PLUGINS + folder + "/www/";
        const configFile = FOLDER_PLUGINS + folder + "/plugin.json";

        if(fs.existsSync(configFile)) {
            try {
                const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

                if(fs.existsSync(servicePath)) {
                    require(servicePath)('/api/'+folder, app);
                }
                if(fs.existsSync(wwwPath)) {
                    if(config.roles && config.roles.length > 0) {
                        // Protect HTML entry points for role-restricted plugins
                        app.use('/'+folder, (req, res, next) => {
                            const isHtmlRequest = req.path === '/' || req.path === '' || req.path.endsWith('.html');
                            if(!isHtmlRequest) return next();

                            const authHeader = req.headers.authorization;
                            const token = (authHeader && authHeader.startsWith('Bearer '))
                                ? authHeader.slice(7)
                                : req.query.token;

                            if(!token) return res.redirect('/?error=unauthorized');

                            try {
                                const jwt = require('jsonwebtoken');
                                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hyperapps-jwt-secret-change-in-production');
                                if(!hasRoleOverlap(decoded.roles, config.roles)) {
                                    return res.redirect('/?error=forbidden');
                                }
                                next();
                            } catch(e) {
                                return res.redirect('/?error=unauthorized');
                            }
                        });
                    }
                    app.use('/'+folder, express.static(wwwPath));
                }

                PLUGIN_REPO[folder] = {
                    ...config,
                    url: '/'+folder,
                    www: fs.existsSync(wwwPath) ? wwwPath : null,
                    service: fs.existsSync(servicePath) ? servicePath : null,
                };
            } catch(err) {
                console.error("ERROR IN LOADING PLUGIN CONFIG : ", folder, err);
            }
        } else {
            console.error("ERROR IN LOADING PLUGIN CONFIG (Not Found) : ", folder);
        }
        // console.log("PLUGIN LOADED : ", folder, PLUGIN_REPO[folder]);
    });

    console.log("\x1b[34m%s\x1b[0m",`\nApplication/Plugin Initialization Completed with `+Object.keys(PLUGIN_REPO).length+` plugins loaded\n`);
}

global.getPluginList = function() {
    return PLUGIN_REPO;
}
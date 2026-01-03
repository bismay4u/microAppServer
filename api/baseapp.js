//Baseapp Controller for handling base application routes

const FOLDER_PLUGINS = _CONFIG.PLUGIN_PATH;
const PLUGIN_REPO = {};

module.exports = function(app) {

    fs.readdirSync(FOLDER_PLUGINS).forEach(folder => {
        if(folder.substring(0,1) === ".") return; //Skip hidden files/folders

        const servicePath = FOLDER_PLUGINS + folder + "/service.js";
        const wwwPath = FOLDER_PLUGINS + folder + "/www/";
        const configFile = FOLDER_PLUGINS + folder + "/plugin.json";

        if(fs.existsSync(configFile)) {
            try {
                const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

                if(fs.existsSync(servicePath)) {
                    require(servicePath)('/'+folder, app);
                }
                if(fs.existsSync(wwwPath)) {
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
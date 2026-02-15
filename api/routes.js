//All additional routes can be defined here and exported

module.exports = function(app) {

    app.get('/getapps', (req, res) => {
        const apps = getPluginList();
        _.each(apps, (app, key) => {
            delete app.service;
            delete app.www;

            if(app.iplock && app.iplock.length>0) {
                if(!req.remoteAddress || !app.iplock.includes(req.remoteAddress)) {
                    delete apps[key];
                }
            }
        });

        res.json(Object.values(apps));
    });

    app.get('/download/:fileId', (req, res) => {
        const filePath = path.join(_CONFIG.OUTPUT_PATH, req.params.fileId);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "sitemap not generated yet" });
        }

        var fileName = req.params.fileId.split("_");
        fileName.shift();
        fileName = fileName.join("_");

        res.setHeader("Content-Type", "application/xml");
        res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
        res.sendFile(filePath);
    });
}
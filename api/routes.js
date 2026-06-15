//All additional routes can be defined here and exported

module.exports = function(app) {

    app.get('/getapps', authMiddleware.optional, (req, res) => {
        const allApps = getPluginList();
        const userRoles = req.user ? (req.user.roles || []) : [];

        const result = [];
        _.each(allApps, (plugin) => {
            const entry = { ...plugin };
            delete entry.service;
            delete entry.www;

            // IP lock check
            if(entry.iplock && entry.iplock.length > 0) {
                if(!req.remoteAddress || !entry.iplock.includes(req.remoteAddress)) return;
            }

            // Role check: no roles key = public; roles key = must have overlap
            if(entry.roles && entry.roles.length > 0) {
                if(!hasRoleOverlap(userRoles, entry.roles)) return;
            }

            result.push(entry);
        });

        res.json(result);
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
        // res.sendFile(filePath);

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);

        res.on("finish", () => {
            fs.unlink(filePath, (err) => {
                if (err) console.error("Delete failed:", err);
                else console.log("File deleted after stream finished");
            });
        });

        stream.on("error", (err) => {
            console.error("Stream error:", err);
            res.sendStatus(500);
        });
    });
}
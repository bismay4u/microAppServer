//All additional routes can be defined here and exported

module.exports = function(app) {

    app.get('/getapps', authMiddleware.optional, (req, res) => {
        const allApps = getPluginList();
        const userRoles = req.user ? (req.user.roles || []) : [];

        const result = [];
        _.each(allApps, (plugin, folder) => {
            const entry = { ...plugin };
            delete entry.service;
            delete entry.www;
            entry.folder = folder;

            // IP lock check
            if(entry.iplock && entry.iplock.length > 0) {
                if(!req.remoteAddress || !entry.iplock.includes(req.remoteAddress)) return;
            }

            // Role check via dynamic access overrides (falls back to plugin.json roles)
            const effectiveRoles = getEffectiveRoles(folder, entry.roles);
            if(effectiveRoles && effectiveRoles.length > 0) {
                if(!hasRoleOverlap(userRoles, effectiveRoles)) return;
            }
            entry.roles = effectiveRoles;

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
// Dynamic per-plugin access control — lets admins change who can see/open a plugin
// without editing that plugin's plugin.json on disk or restarting the server.
const PLUGIN_ACCESS_FILE = path.join(_CONFIG.ROOT_PATH, 'data/pluginAccess.json');

function loadPluginAccess() {
    if (!fs.existsSync(PLUGIN_ACCESS_FILE)) {
        const dataDir = path.dirname(PLUGIN_ACCESS_FILE);
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(PLUGIN_ACCESS_FILE, JSON.stringify({ overrides: {} }, null, 2));
    }
    return JSON.parse(fs.readFileSync(PLUGIN_ACCESS_FILE, 'utf8'));
}

function savePluginAccess(data) {
    fs.writeFileSync(PLUGIN_ACCESS_FILE, JSON.stringify(data, null, 2));
}

// An explicit override (even an empty array, meaning "public") always wins over plugin.json's roles
global.getEffectiveRoles = function(folder, defaultRoles) {
    const overrides = loadPluginAccess().overrides;
    return overrides.hasOwnProperty(folder) ? overrides[folder] : (defaultRoles || []);
};

module.exports = function(app) {

    // GET /plugin-access — admin only: every installed plugin with its default + effective roles
    app.get('/plugin-access', authMiddleware.required, (req, res) => {
        if (!req.user.roles.includes('admin')) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const overrides = loadPluginAccess().overrides;
        const allPlugins = getPluginList();
        const result = Object.keys(allPlugins).map(folder => {
            const plugin = allPlugins[folder];
            const defaultRoles = plugin.roles || [];
            return {
                folder,
                name: plugin.name,
                icon: plugin.icon,
                color: plugin.color,
                group: plugin.group || '',
                hidden: !!plugin.hidden,
                defaultRoles,
                roles: overrides.hasOwnProperty(folder) ? overrides[folder] : defaultRoles,
                overridden: overrides.hasOwnProperty(folder)
            };
        });
        res.json(result);
    });

    // PUT /plugin-access/:folder — admin only: set an explicit role override for a plugin
    app.put('/plugin-access/:folder', authMiddleware.required, (req, res) => {
        if (!req.user.roles.includes('admin')) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const allPlugins = getPluginList();
        if (!allPlugins[req.params.folder]) {
            return res.status(404).json({ error: 'Plugin not found' });
        }
        const { roles } = req.body;
        if (!Array.isArray(roles)) {
            return res.status(400).json({ error: 'roles must be an array' });
        }
        const data = loadPluginAccess();
        data.overrides[req.params.folder] = roles;
        savePluginAccess(data);
        res.json({ folder: req.params.folder, roles });
    });

    // DELETE /plugin-access/:folder — admin only: revert to the plugin.json default
    app.delete('/plugin-access/:folder', authMiddleware.required, (req, res) => {
        if (!req.user.roles.includes('admin')) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const data = loadPluginAccess();
        delete data.overrides[req.params.folder];
        savePluginAccess(data);
        res.json({ message: 'Reverted to default' });
    });
};

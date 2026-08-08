// Addon link cards — direct external links shown on the apphub, no plugin code involved
const ADDONS_FILE = path.join(_CONFIG.ROOT_PATH, 'data/addons.json');
const URL_PATTERN = /^https?:\/\/.+/i;

function loadAddons() {
    if (!fs.existsSync(ADDONS_FILE)) {
        const dataDir = path.dirname(ADDONS_FILE);
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(ADDONS_FILE, JSON.stringify({ addons: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(ADDONS_FILE, 'utf8'));
}

function saveAddons(data) {
    fs.writeFileSync(ADDONS_FILE, JSON.stringify(data, null, 2));
}

module.exports = function(app) {

    // GET /addons — role-filtered list for the apphub UI
    app.get('/addons', authMiddleware.optional, (req, res) => {
        const data = loadAddons();
        const userRoles = req.user ? (req.user.roles || []) : [];
        const result = data.addons.filter(a => hasRoleOverlap(userRoles, a.roles));
        res.json(result);
    });

    // GET /addons/all — admin only: unfiltered list for the management panel
    app.get('/addons/all', authMiddleware.required, (req, res) => {
        if (!req.user.roles.includes('admin')) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        res.json(loadAddons().addons);
    });

    // POST /addons — admin only: create
    app.post('/addons', authMiddleware.required, (req, res) => {
        if (!req.user.roles.includes('admin')) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const { name, description, url, icon, color, roles, group } = req.body;
        if (!name || !url) {
            return res.status(400).json({ error: 'Name and URL are required' });
        }
        if (!URL_PATTERN.test(url)) {
            return res.status(400).json({ error: 'URL must start with http:// or https://' });
        }
        const data = loadAddons();
        const newAddon = {
            id: uuidv4(),
            name,
            description: description || '',
            url,
            icon: icon || '🔗',
            color: color || 'blue',
            group: group || '',
            roles: Array.isArray(roles) ? roles : [],
            createdAt: moment().format()
        };
        data.addons.push(newAddon);
        saveAddons(data);
        res.status(201).json(newAddon);
    });

    // PUT /addons/:id — admin only: update
    app.put('/addons/:id', authMiddleware.required, (req, res) => {
        if (!req.user.roles.includes('admin')) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const data = loadAddons();
        const idx = data.addons.findIndex(a => a.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Addon not found' });

        const { name, description, url, icon, color, roles, group } = req.body;
        if (url !== undefined && !URL_PATTERN.test(url)) {
            return res.status(400).json({ error: 'URL must start with http:// or https://' });
        }

        if (name !== undefined) data.addons[idx].name = name;
        if (description !== undefined) data.addons[idx].description = description;
        if (url !== undefined) data.addons[idx].url = url;
        if (icon !== undefined) data.addons[idx].icon = icon;
        if (color !== undefined) data.addons[idx].color = color;
        if (group !== undefined) data.addons[idx].group = group;
        if (Array.isArray(roles)) data.addons[idx].roles = roles;

        saveAddons(data);
        res.json(data.addons[idx]);
    });

    // DELETE /addons/:id — admin only
    app.delete('/addons/:id', authMiddleware.required, (req, res) => {
        if (!req.user.roles.includes('admin')) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const data = loadAddons();
        const idx = data.addons.findIndex(a => a.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Addon not found' });
        data.addons.splice(idx, 1);
        saveAddons(data);
        res.json({ message: 'Addon deleted' });
    });
};

// User management and authentication
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const USERS_FILE = path.join(_CONFIG.ROOT_PATH, 'data/users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'hyperapps-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(':');
    const hashToVerify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(hashToVerify, 'hex'));
}

function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) {
        const dataDir = path.dirname(USERS_FILE);
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        const seed = { users: [] };
        fs.writeFileSync(USERS_FILE, JSON.stringify(seed, null, 2));
    }
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function saveUsers(data) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

function seedDefaultAdmin() {
    const data = loadUsers();
    if (data.users.length === 0) {
        data.users.push({
            id: uuidv4(),
            username: 'admin',
            email: 'admin@example.com',
            password: hashPassword('admin123'),
            roles: ['admin', 'admin_products'],
            createdAt: moment().format()
        });
        saveUsers(data);
        console.log('\x1b[32m%s\x1b[0m', 'Default admin user created (username: admin, password: admin123)');
    }
}

function signToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, roles: user.roles },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

// Global middleware helpers
global.authMiddleware = {
    optional: function(req, res, next) {
        const authHeader = req.headers.authorization;
        const token = (authHeader && authHeader.startsWith('Bearer '))
            ? authHeader.slice(7)
            : req.query.token;
        if (token) {
            try {
                req.user = jwt.verify(token, JWT_SECRET);
            } catch(e) {
                req.user = null;
            }
        } else {
            req.user = null;
        }
        next();
    },

    required: function(req, res, next) {
        const authHeader = req.headers.authorization;
        const token = (authHeader && authHeader.startsWith('Bearer '))
            ? authHeader.slice(7)
            : req.query.token;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });
        try {
            req.user = jwt.verify(token, JWT_SECRET);
            next();
        } catch(e) {
            res.status(401).json({ error: 'Invalid or expired token' });
        }
    }
};

global.hasRoleOverlap = function(userRoles, requiredRoles) {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    if (!userRoles || userRoles.length === 0) return false;
    return requiredRoles.some(r => userRoles.includes(r));
};

module.exports = function(app) {
    seedDefaultAdmin();

    // POST /auth/login
    app.post('/auth/login', (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const data = loadUsers();
        const user = data.users.find(u => u.username === username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        let valid = false;
        try {
            valid = verifyPassword(password, user.password);
        } catch(e) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = signToken(user);
        res.json({
            token,
            user: { id: user.id, username: user.username, email: user.email, roles: user.roles }
        });
    });

    // GET /auth/me
    app.get('/auth/me', authMiddleware.required, (req, res) => {
        const data = loadUsers();
        const user = data.users.find(u => u.id === req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ id: user.id, username: user.username, email: user.email, roles: user.roles });
    });

    // POST /auth/logout — token invalidation is client-side; server just confirms
    app.post('/auth/logout', (req, res) => {
        res.json({ message: 'Logged out successfully' });
    });

    // GET /users — admin only
    app.get('/users', authMiddleware.required, (req, res) => {
        if (!req.user.roles.includes('admin')) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const data = loadUsers();
        const safeUsers = data.users.map(({ password, ...u }) => u);
        res.json(safeUsers);
    });

    // POST /users — admin only: create user
    app.post('/users', authMiddleware.required, (req, res) => {
        if (!req.user.roles.includes('admin')) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const { username, email, password, roles } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        const data = loadUsers();
        if (data.users.find(u => u.username === username)) {
            return res.status(409).json({ error: 'Username already exists' });
        }
        const newUser = {
            id: uuidv4(),
            username,
            email: email || '',
            password: hashPassword(password),
            roles: Array.isArray(roles) ? roles : [],
            createdAt: moment().format()
        };
        data.users.push(newUser);
        saveUsers(data);
        const { password: _, ...safeUser } = newUser;
        res.status(201).json(safeUser);
    });

    // PUT /users/:id — admin only: update roles/email
    app.put('/users/:id', authMiddleware.required, (req, res) => {
        if (!req.user.roles.includes('admin')) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const data = loadUsers();
        const idx = data.users.findIndex(u => u.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'User not found' });

        const { email, roles, password } = req.body;
        if (email !== undefined) data.users[idx].email = email;
        if (Array.isArray(roles)) data.users[idx].roles = roles;
        if (password) data.users[idx].password = hashPassword(password);

        saveUsers(data);
        const { password: _, ...safeUser } = data.users[idx];
        res.json(safeUser);
    });

    // DELETE /users/:id — admin only
    app.delete('/users/:id', authMiddleware.required, (req, res) => {
        if (!req.user.roles.includes('admin')) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const data = loadUsers();
        const idx = data.users.findIndex(u => u.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'User not found' });
        if (data.users[idx].username === 'admin') {
            return res.status(400).json({ error: 'Cannot delete the admin user' });
        }
        data.users.splice(idx, 1);
        saveUsers(data);
        res.json({ message: 'User deleted' });
    });
};

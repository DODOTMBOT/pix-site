/**
 * PiX Auth Routes
 * В server.js добавь в самом начале:
 *
 *   const { registerAuthRoutes } = require('./auth-routes');
 *
 * После создания app и db добавь:
 *
 *   registerAuthRoutes(app, db);
 *
 * Зависимости (npm install):
 *   bcrypt jsonwebtoken
 */

const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');

const JWT_SECRET       = process.env.JWT_SECRET || 'pix-secret-key-change-in-production';
const SUPER_EMAIL      = 'e.arutyunov.dodo@gmail.com';
const SUPER_PASSWORD   = 'PIX2024admin!';

function registerAuthRoutes(app, db) {

  // ─── Migration ────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS pix_users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name          TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'manager',
      pizzerias     TEXT DEFAULT '[]',
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const existing = db.prepare('SELECT id FROM pix_users WHERE email = ?').get(SUPER_EMAIL);
  if (!existing) {
    const hash = bcrypt.hashSync(SUPER_PASSWORD, 10);
    db.prepare(
      'INSERT INTO pix_users (email, password_hash, name, role, pizzerias) VALUES (?, ?, ?, ?, ?)'
    ).run(SUPER_EMAIL, hash, 'Суперадмин', 'superadmin', '[]');
    console.log('[auth] Superadmin created:', SUPER_EMAIL);
  }

  // ─── Middleware ───────────────────────────────────────────────────────────
  function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  }

  function requireRole(...roles) {
    return (req, res, next) => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    };
  }

  function fmtUser(u) {
    return { id: u.id, email: u.email, name: u.name, role: u.role, pizzerias: JSON.parse(u.pizzerias || '[]') };
  }

  // ─── POST /api/auth/login ─────────────────────────────────────────────────
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email и пароль обязательны' });

    const user = db.prepare('SELECT * FROM pix_users WHERE email = ?').get(email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: fmtUser(user) });
  });

  // ─── POST /api/auth/register (superadmin only) ────────────────────────────
  app.post('/api/auth/register', authMiddleware, requireRole('superadmin'), (req, res) => {
    const { email, password, name, role, pizzerias = [] } = req.body;
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }
    if (!['management', 'manager'].includes(role)) {
      return res.status(400).json({ error: 'Недопустимая роль' });
    }
    const hash = bcrypt.hashSync(password, 10);
    try {
      const result = db.prepare(
        'INSERT INTO pix_users (email, password_hash, name, role, pizzerias) VALUES (?, ?, ?, ?, ?)'
      ).run(email, hash, name, role, JSON.stringify(pizzerias));
      const user = db.prepare('SELECT * FROM pix_users WHERE id = ?').get(result.lastInsertRowid);
      res.json({ success: true, user: fmtUser(user) });
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'Email уже используется' });
      }
      throw e;
    }
  });

  // ─── GET /api/auth/me ─────────────────────────────────────────────────────
  app.get('/api/auth/me', authMiddleware, (req, res) => {
    const user = db.prepare('SELECT * FROM pix_users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(fmtUser(user));
  });

  // ─── GET /api/users ───────────────────────────────────────────────────────
  app.get('/api/users', authMiddleware, requireRole('superadmin', 'management'), (req, res) => {
    const users = db.prepare('SELECT * FROM pix_users ORDER BY id').all();
    res.json(users.map(fmtUser));
  });

  // ─── GET /api/users/:id ───────────────────────────────────────────────────
  app.get('/api/users/:id', authMiddleware, requireRole('superadmin', 'management'), (req, res) => {
    const user = db.prepare('SELECT * FROM pix_users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(fmtUser(user));
  });

  // ─── PUT /api/users/:id ───────────────────────────────────────────────────
  app.put('/api/users/:id', authMiddleware, requireRole('superadmin'), (req, res) => {
    const { name, role, pizzerias, password } = req.body;
    const sets = []; const vals = [];
    if (name      !== undefined) { sets.push('name = ?');          vals.push(name); }
    if (role      !== undefined) { sets.push('role = ?');          vals.push(role); }
    if (pizzerias !== undefined) { sets.push('pizzerias = ?');     vals.push(JSON.stringify(pizzerias)); }
    if (password)                { sets.push('password_hash = ?'); vals.push(bcrypt.hashSync(password, 10)); }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    db.prepare(`UPDATE pix_users SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    const user = db.prepare('SELECT * FROM pix_users WHERE id = ?').get(req.params.id);
    res.json(fmtUser(user));
  });

  // ─── DELETE /api/users/:id ────────────────────────────────────────────────
  app.delete('/api/users/:id', authMiddleware, requireRole('superadmin'), (req, res) => {
    const user = db.prepare('SELECT * FROM pix_users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    if (user.role === 'superadmin') return res.status(403).json({ error: 'Cannot delete superadmin' });
    db.prepare('DELETE FROM pix_users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  console.log('[auth] Routes registered');
}

module.exports = { registerAuthRoutes };

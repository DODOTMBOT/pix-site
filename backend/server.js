'use strict';

const express   = require('express');
const Database  = require('better-sqlite3');
const bcrypt    = require('bcrypt');
const jwt       = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const path      = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'pix-secret-key-change-in-production';
const PORT       = process.env.PORT || 3000;
const DB_PATH    = path.join(__dirname, 'dodo.db');

// ── Database ───────────────────────────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ─────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL CHECK(role IN ('superadmin', 'management', 'manager', 'shift_manager')),
    job_title     TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS pizzerias (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    city         TEXT,
    street       TEXT,
    house        TEXT,
    legal_entity TEXT,
    manager_id   INTEGER,
    curator_id   INTEGER,
    opening_date DATE,
    is_archived  INTEGER DEFAULT 0,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (curator_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS user_pizzerias (
    user_id     INTEGER NOT NULL,
    pizzeria_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, pizzeria_id),
    FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
    FOREIGN KEY (pizzeria_id) REFERENCES pizzerias(id) ON DELETE CASCADE
  );
`);

// ── Superadmin seed ────────────────────────────────────────────────────────────
const existingSuperadmin = db.prepare("SELECT id FROM users WHERE role = 'superadmin'").get();
if (!existingSuperadmin) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare("INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)")
    .run('admin@pix-dodo.ru', hash, 'Суперадмин', 'superadmin');
  console.log('[init] Superadmin created: admin@pix-dodo.ru / admin123');
}

// ── Middleware ─────────────────────────────────────────────────────────────────
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
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getUserPizzeriaIds(userId, role) {
  if (role === 'superadmin') {
    return db.prepare("SELECT id FROM pizzerias WHERE is_archived = 0").all().map(r => r.id);
  }
  return db.prepare("SELECT pizzeria_id FROM user_pizzerias WHERE user_id = ?").all(userId).map(r => r.pizzeria_id);
}

function fmtUser(u) {
  return {
    id:        u.id,
    email:     u.email,
    name:      u.name,
    role:      u.role,
    job_title: u.job_title ?? null,
  };
}

function getPizzeriaFull(id) {
  return db.prepare(`
    SELECT p.*,
           um.name      AS manager_name,
           uc.name      AS curator_name,
           uc.job_title AS curator_job_title
    FROM   pizzerias p
    LEFT JOIN users um ON um.id = p.manager_id
    LEFT JOIN users uc ON uc.id = p.curator_id
    WHERE  p.id = ?
  `).get(id);
}

function fmtPizzeria(p) {
  return {
    id:           p.id,
    name:         p.name,
    city:         p.city   ?? null,
    street:       p.street ?? null,
    house:        p.house  ?? null,
    legal_entity: p.legal_entity  ?? null,
    opening_date: p.opening_date  ?? null,
    manager:      p.manager_id ? { id: p.manager_id, name: p.manager_name } : null,
    curator:      p.curator_id  ? { id: p.curator_id,  name: p.curator_name, job_title: p.curator_job_title ?? null } : null,
    is_archived:  p.is_archived,
  };
}

// ── Express ────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// ── Auth ───────────────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Слишком много попыток входа. Попробуйте через 15 минут.' },
});

// POST /api/auth/login
app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email и пароль обязательны' });

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ token, user: fmtUser(user) });
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Not found' });

  const ids = getUserPizzeriaIds(user.id, user.role);
  const pizzerias = ids.length > 0
    ? db.prepare(
        `SELECT id, name, city, street, house FROM pizzerias
         WHERE id IN (${ids.map(() => '?').join(',')}) AND is_archived = 0`
      ).all(...ids)
    : [];

  res.json({ user: fmtUser(user), pizzerias });
});

// ── Pizzerias ──────────────────────────────────────────────────────────────────

// GET /api/pizzerias
app.get('/api/pizzerias', authMiddleware, (req, res) => {
  const ids = getUserPizzeriaIds(req.user.id, req.user.role);

  if (ids.length === 0) return res.json([]);

  const rows = db.prepare(`
    SELECT p.*,
           um.name      AS manager_name,
           uc.name      AS curator_name,
           uc.job_title AS curator_job_title
    FROM   pizzerias p
    LEFT JOIN users um ON um.id = p.manager_id
    LEFT JOIN users uc ON uc.id = p.curator_id
    WHERE  p.id IN (${ids.map(() => '?').join(',')}) AND p.is_archived = 0
    ORDER BY p.id
  `).all(...ids);

  res.json(rows.map(fmtPizzeria));
});

// GET /api/pizzerias/:id
app.get('/api/pizzerias/:id', authMiddleware, (req, res) => {
  const p = getPizzeriaFull(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });

  if (req.user.role !== 'superadmin') {
    const ids = getUserPizzeriaIds(req.user.id, req.user.role);
    if (!ids.includes(p.id)) return res.status(403).json({ error: 'Forbidden' });
  }

  res.json(fmtPizzeria(p));
});

// POST /api/pizzerias
app.post('/api/pizzerias', authMiddleware, requireRole('management', 'superadmin'), (req, res) => {
  const { name, city, street, house, legal_entity, manager_id, curator_id, opening_date } = req.body;
  if (!name || String(name).trim().length < 2) {
    return res.status(400).json({ error: 'Название обязательно (минимум 2 символа)' });
  }

  const result = db.prepare(`
    INSERT INTO pizzerias (name, city, street, house, legal_entity, manager_id, curator_id, opening_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    String(name).trim(),
    city         || null,
    street       || null,
    house        || null,
    legal_entity || null,
    manager_id   || null,
    curator_id   || null,
    opening_date || null,
  );

  const pid = result.lastInsertRowid;

  const ins = db.prepare("INSERT OR IGNORE INTO user_pizzerias (user_id, pizzeria_id) VALUES (?, ?)");
  if (manager_id) ins.run(manager_id, pid);
  if (curator_id && curator_id !== manager_id) ins.run(curator_id, pid);

  res.status(201).json(fmtPizzeria(getPizzeriaFull(pid)));
});

// PUT /api/pizzerias/:id
app.put('/api/pizzerias/:id', authMiddleware, requireRole('management', 'superadmin'), (req, res) => {
  const id = parseInt(req.params.id);
  const existing = db.prepare("SELECT * FROM pizzerias WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { name, city, street, house, legal_entity, manager_id, curator_id, opening_date } = req.body;

  if (name !== undefined && (!name || String(name).trim().length < 2)) {
    return res.status(400).json({ error: 'Название обязательно (минимум 2 символа)' });
  }

  const newManagerId = manager_id !== undefined ? (manager_id || null) : existing.manager_id;
  const newCuratorId = curator_id !== undefined ? (curator_id || null) : existing.curator_id;

  db.prepare(`
    UPDATE pizzerias
    SET name=?, city=?, street=?, house=?, legal_entity=?, manager_id=?, curator_id=?, opening_date=?
    WHERE id=?
  `).run(
    name         !== undefined ? String(name).trim()  : existing.name,
    city         !== undefined ? (city  || null)       : existing.city,
    street       !== undefined ? (street || null)      : existing.street,
    house        !== undefined ? (house || null)       : existing.house,
    legal_entity !== undefined ? (legal_entity || null): existing.legal_entity,
    newManagerId,
    newCuratorId,
    opening_date !== undefined ? (opening_date || null): existing.opening_date,
    id,
  );

  const del = db.prepare("DELETE FROM user_pizzerias WHERE user_id = ? AND pizzeria_id = ?");
  const ins = db.prepare("INSERT OR IGNORE INTO user_pizzerias (user_id, pizzeria_id) VALUES (?, ?)");

  if (manager_id !== undefined) {
    if (existing.manager_id && existing.manager_id !== newManagerId) {
      const isAlsoCurator = existing.manager_id === existing.curator_id || existing.manager_id === newCuratorId;
      if (!isAlsoCurator) del.run(existing.manager_id, id);
    }
    if (newManagerId) ins.run(newManagerId, id);
  }

  if (curator_id !== undefined) {
    if (existing.curator_id && existing.curator_id !== newCuratorId) {
      const isAlsoManager = existing.curator_id === existing.manager_id || existing.curator_id === newManagerId;
      if (!isAlsoManager) del.run(existing.curator_id, id);
    }
    if (newCuratorId) ins.run(newCuratorId, id);
  }

  res.json(fmtPizzeria(getPizzeriaFull(id)));
});

// DELETE /api/pizzerias/:id  — archive
app.delete('/api/pizzerias/:id', authMiddleware, requireRole('management', 'superadmin'), (req, res) => {
  const p = db.prepare("SELECT id FROM pizzerias WHERE id = ?").get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  db.prepare("UPDATE pizzerias SET is_archived = 1 WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ── Users ──────────────────────────────────────────────────────────────────────

// GET /api/users
app.get('/api/users', authMiddleware, requireRole('superadmin', 'management'), (req, res) => {
  const users = db.prepare("SELECT * FROM users ORDER BY id").all();
  res.json(users.map(u => ({
    ...fmtUser(u),
    pizzeria_ids: db.prepare("SELECT pizzeria_id FROM user_pizzerias WHERE user_id = ?")
      .all(u.id).map(r => r.pizzeria_id),
  })));
});

// GET /api/users/by-role/:role  — must come before /:id
app.get('/api/users/by-role/:role', authMiddleware, (req, res) => {
  const users = db.prepare("SELECT * FROM users WHERE role = ? ORDER BY name").all(req.params.role);
  res.json(users.map(fmtUser));
});

// GET /api/users/:id
app.get('/api/users/:id', authMiddleware, requireRole('superadmin', 'management'), (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const pizzeria_ids = db.prepare("SELECT pizzeria_id FROM user_pizzerias WHERE user_id = ?")
    .all(user.id).map(r => r.pizzeria_id);
  res.json({ ...fmtUser(user), pizzeria_ids });
});

// POST /api/users
app.post('/api/users', authMiddleware, requireRole('superadmin'), (req, res) => {
  const { email, password, name, role, job_title, pizzeria_ids = [] } = req.body;
  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'email, password, name, role обязательны' });
  }
  if (!['management', 'manager', 'shift_manager'].includes(role)) {
    return res.status(400).json({ error: 'Недопустимая роль' });
  }
  if (role === 'shift_manager' && pizzeria_ids.length !== 1) {
    return res.status(400).json({ error: 'Для shift_manager нужна ровно одна пиццерия' });
  }

  const hash = bcrypt.hashSync(password, 10);
  let result;
  try {
    result = db.prepare(
      "INSERT INTO users (email, password_hash, name, role, job_title) VALUES (?, ?, ?, ?, ?)"
    ).run(email, hash, name, role, job_title || null);
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email уже используется' });
    }
    throw e;
  }

  const userId = result.lastInsertRowid;
  const ins = db.prepare("INSERT OR IGNORE INTO user_pizzerias (user_id, pizzeria_id) VALUES (?, ?)");
  for (const pid of pizzeria_ids) ins.run(userId, pid);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  res.status(201).json({ ...fmtUser(user), pizzeria_ids });
});

// PUT /api/users/:id
app.put('/api/users/:id', authMiddleware, requireRole('superadmin'), (req, res) => {
  const id = parseInt(req.params.id);
  const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { name, password, role, job_title, pizzeria_ids } = req.body;

  if (existing.role === 'superadmin' && role && role !== 'superadmin') {
    return res.status(403).json({ error: 'Нельзя изменить роль суперадмина' });
  }
  if (role && !['management', 'manager', 'shift_manager'].includes(role) && role !== 'superadmin') {
    return res.status(400).json({ error: 'Недопустимая роль' });
  }
  const newRole = role ?? existing.role;
  if (newRole === 'shift_manager' && pizzeria_ids !== undefined && pizzeria_ids.length !== 1) {
    return res.status(400).json({ error: 'Для shift_manager нужна ровно одна пиццерия' });
  }

  const sets = []; const vals = [];
  if (name      !== undefined) { sets.push('name = ?');          vals.push(name); }
  if (role      !== undefined && existing.role !== 'superadmin') { sets.push('role = ?'); vals.push(role); }
  if (job_title !== undefined) { sets.push('job_title = ?');     vals.push(job_title || null); }
  if (password)                { sets.push('password_hash = ?'); vals.push(bcrypt.hashSync(password, 10)); }

  if (sets.length) {
    vals.push(id);
    db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  }

  if (pizzeria_ids !== undefined && newRole !== 'superadmin') {
    db.prepare("DELETE FROM user_pizzerias WHERE user_id = ?").run(id);
    const ins = db.prepare("INSERT OR IGNORE INTO user_pizzerias (user_id, pizzeria_id) VALUES (?, ?)");
    for (const pid of pizzeria_ids) ins.run(id, pid);
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  const pids = db.prepare("SELECT pizzeria_id FROM user_pizzerias WHERE user_id = ?")
    .all(id).map(r => r.pizzeria_id);
  res.json({ ...fmtUser(user), pizzeria_ids: pids });
});

// DELETE /api/users/:id
app.delete('/api/users/:id', authMiddleware, requireRole('superadmin'), (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  if (user.role === 'superadmin') {
    return res.status(403).json({ error: 'Нельзя удалить суперадмина' });
  }
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[server] PiX backend running on port ${PORT}`);
});

'use strict';

const express      = require('express');
const Database     = require('better-sqlite3');
const bcrypt       = require('bcrypt');
const rateLimit    = require('express-rate-limit');
const session      = require('express-session');
const SQLiteStore  = require('connect-sqlite3')(session);
const path         = require('path');
const fs           = require('fs');

const SESSION_SECRET = process.env.SESSION_SECRET || 'pix-session-secret-change-in-production';
const PORT           = process.env.PORT || 3000;
// DB and sessions live in ../data/ so they survive backend directory replacements on deploy
const DATA_DIR = path.join(__dirname, '../data');
const DB_PATH  = path.join(DATA_DIR, 'dodo.db');
fs.mkdirSync(DATA_DIR, { recursive: true });

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

  CREATE TABLE IF NOT EXISTS contacts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    pizzeria_id INTEGER NOT NULL REFERENCES pizzerias(id) ON DELETE CASCADE,
    category    TEXT NOT NULL,
    name        TEXT NOT NULL,
    phone       TEXT,
    email       TEXT,
    notes       TEXT,
    created_at  TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS rates (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    pizzeria_id    INTEGER NOT NULL REFERENCES pizzerias(id) ON DELETE CASCADE,
    position       TEXT NOT NULL,
    hourly_rate    INTEGER,
    monthly_salary INTEGER,
    notes          TEXT,
    created_at     TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS credentials (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    pizzeria_id  INTEGER NOT NULL REFERENCES pizzerias(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL,
    login        TEXT,
    password     TEXT,
    url          TEXT,
    notes        TEXT,
    created_at   TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS motivation (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    pizzeria_id  INTEGER NOT NULL REFERENCES pizzerias(id) ON DELETE CASCADE,
    metric_name  TEXT NOT NULL,
    threshold    INTEGER NOT NULL,
    bonus_amount INTEGER NOT NULL,
    description  TEXT,
    is_active    INTEGER DEFAULT 1,
    created_at   TEXT DEFAULT CURRENT_TIMESTAMP
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

// ── Role permissions ───────────────────────────────────────────────────────────
db.exec(`CREATE TABLE IF NOT EXISTS role_permissions (
  role      TEXT NOT NULL,
  resource  TEXT NOT NULL,
  can_read  INTEGER NOT NULL DEFAULT 0,
  can_write INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (role, resource)
)`);
if (!db.prepare("SELECT COUNT(*) AS c FROM role_permissions").get().c) {
  const ins = db.prepare("INSERT OR IGNORE INTO role_permissions (role, resource, can_read, can_write) VALUES (?, ?, ?, ?)");
  db.transaction(() => {
    [
      ['management',    'contacts',       1, 1],
      ['management',    'rates',          1, 1],
      ['management',    'credentials',    1, 1],
      ['management',    'motivation',     1, 1],
      ['management',    'pizzerias',      1, 1],
      ['management',    'schedules_own',  1, 1],
      ['management',    'schedules_all',  1, 0],
      ['manager',       'contacts',       1, 0],
      ['manager',       'rates',          1, 0],
      ['manager',       'credentials',    1, 0],
      ['manager',       'motivation',     1, 0],
      ['manager',       'pizzerias',      0, 0],
      ['manager',       'schedules_own',  1, 1],
      ['manager',       'schedules_all',  0, 0],
      ['shift_manager', 'contacts',       0, 0],
      ['shift_manager', 'rates',          0, 0],
      ['shift_manager', 'credentials',    0, 0],
      ['shift_manager', 'motivation',     0, 0],
      ['shift_manager', 'pizzerias',      0, 0],
      ['shift_manager', 'schedules_own',  1, 1],
      ['shift_manager', 'schedules_all',  0, 0],
    ].forEach(d => ins.run(...d));
  })();
}

// ── Middleware ─────────────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  // Always read role from DB so role changes take effect immediately without re-login
  const user = db.prepare("SELECT id, role FROM users WHERE id = ?").get(req.session.userId);
  if (!user) { req.session.destroy(() => {}); return res.status(401).json({ error: 'Unauthorized' }); }
  req.user = { id: user.id, role: user.role };
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

function requirePerm(resource, write = false) {
  return (req, res, next) => {
    if (req.user.role === 'superadmin') return next();
    const p = db.prepare("SELECT can_read, can_write FROM role_permissions WHERE role = ? AND resource = ?")
      .get(req.user.role, resource);
    if (!p || !p.can_read) return res.status(403).json({ error: 'Нет доступа' });
    if (write && !p.can_write) return res.status(403).json({ error: 'Нет доступа на запись' });
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
app.set('trust proxy', 1);
app.use(express.json());
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: DATA_DIR }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'pix.sid',
  cookie: {
    secure:   false,
    httpOnly: true,
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000,
  },
}));

// ── No-cache for all API responses ────────────────────────────────────────────
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// ── Auth ───────────────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
});

// POST /api/auth/login
app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email и пароль обязательны' });

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }

  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: 'Ошибка сессии' });
    req.session.userId    = user.id;
    req.session.userEmail = user.email;
    req.session.userRole  = user.role;
    req.session.userName  = user.name;
    req.session.save(saveErr => {
      if (saveErr) return res.status(500).json({ error: 'Ошибка сессии' });
      res.json({ user: fmtUser(user) });
    });
  });
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('pix.sid');
    res.json({ success: true });
  });
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Not found' });

  const pizzerias = db.prepare(
    "SELECT id, name, city, street, house FROM pizzerias WHERE is_archived = 0 ORDER BY name"
  ).all();

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
app.post('/api/pizzerias', authMiddleware, requirePerm('pizzerias', true), (req, res) => {
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
app.put('/api/pizzerias/:id', authMiddleware, requirePerm('pizzerias', true), (req, res) => {
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
app.delete('/api/pizzerias/:id', authMiddleware, requirePerm('pizzerias', true), (req, res) => {
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

// ── Pizzeria access helper ─────────────────────────────────────────────────────
function requirePizzeriaAccess(req, res, next) {
  const pizzeriaId = parseInt(req.params.pizzeriaId);
  if (isNaN(pizzeriaId)) return res.status(400).json({ error: 'Invalid pizzeriaId' });

  if (req.user.role === 'superadmin') { req.pizzeriaId = pizzeriaId; return next(); }

  const allowed = db.prepare("SELECT 1 FROM user_pizzerias WHERE user_id = ? AND pizzeria_id = ?")
    .get(req.user.id, pizzeriaId);
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });

  req.pizzeriaId = pizzeriaId;
  next();
}

// ── Contacts ───────────────────────────────────────────────────────────────────
// Schema migration: make pizzeria_id nullable, add position, create junction table
(function migrateContacts() {
  const cols = db.pragma("table_info(contacts)").reduce((m, c) => { m[c.name] = c; return m; }, {});

  // Recreate table if pizzeria_id is still NOT NULL (old schema)
  if (cols.pizzeria_id && cols.pizzeria_id.notnull) {
    const posCol = cols.position ? 'position,' : '';
    db.exec(`
      CREATE TABLE contacts_tmp (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        pizzeria_id INTEGER,
        category    TEXT,
        position    TEXT,
        name        TEXT NOT NULL,
        phone       TEXT,
        email       TEXT,
        notes       TEXT,
        created_at  TEXT DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO contacts_tmp (id, pizzeria_id, category, ${posCol} name, phone, email, notes, created_at)
        SELECT id, pizzeria_id, category, ${posCol} name, phone, email, notes, created_at FROM contacts;
      DROP TABLE contacts;
      ALTER TABLE contacts_tmp RENAME TO contacts;
    `);
  } else if (!cols.position) {
    try { db.exec("ALTER TABLE contacts ADD COLUMN position TEXT"); } catch {}
  }

  db.exec(`CREATE TABLE IF NOT EXISTS contact_pizzerias (
    contact_id  INTEGER NOT NULL,
    pizzeria_id INTEGER NOT NULL,
    PRIMARY KEY (contact_id, pizzeria_id)
  )`);

  // One-time migration: move existing pizzeria_id into junction table
  const rows = db.prepare("SELECT id, pizzeria_id FROM contacts WHERE pizzeria_id IS NOT NULL AND pizzeria_id > 0").all();
  const ins  = db.prepare("INSERT OR IGNORE INTO contact_pizzerias (contact_id, pizzeria_id) VALUES (?, ?)");
  for (const row of rows) ins.run(row.id, row.pizzeria_id);
})();

const getContactPizzerias = db.prepare(
  "SELECT p.id, p.name FROM pizzerias p JOIN contact_pizzerias cp ON cp.pizzeria_id = p.id WHERE cp.contact_id = ? ORDER BY p.name"
);

app.get('/api/contacts', authMiddleware, requirePerm('contacts'), (req, res) => {
  const contacts = db.prepare("SELECT id, position, name, phone, email FROM contacts ORDER BY name").all();
  res.json(contacts.map(c => ({ ...c, pizzerias: getContactPizzerias.all(c.id) })));
});

app.post('/api/contacts', authMiddleware, requirePerm('contacts', true), (req, res) => {
  const { position, name, phone, email, pizzeria_ids } = req.body;
  if (!name) return res.status(400).json({ error: 'name обязателен' });
  const r = db.prepare(
    "INSERT INTO contacts (position, name, phone, email) VALUES (?, ?, ?, ?)"
  ).run(position || null, name, phone || null, email || null);
  const id = r.lastInsertRowid;
  if (Array.isArray(pizzeria_ids)) {
    const ins = db.prepare("INSERT OR IGNORE INTO contact_pizzerias (contact_id, pizzeria_id) VALUES (?, ?)");
    for (const pid of pizzeria_ids) ins.run(id, pid);
  }
  const contact = db.prepare("SELECT id, position, name, phone, email FROM contacts WHERE id = ?").get(id);
  res.status(201).json({ ...contact, pizzerias: getContactPizzerias.all(id) });
});

app.put('/api/contacts/:id', authMiddleware, requirePerm('contacts', true), (req, res) => {
  const row = db.prepare("SELECT id FROM contacts WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const { position, name, phone, email, pizzeria_ids } = req.body;
  db.prepare("UPDATE contacts SET position=?, name=?, phone=?, email=? WHERE id=?")
    .run(position || null, name, phone || null, email || null, req.params.id);
  if (Array.isArray(pizzeria_ids)) {
    db.prepare("DELETE FROM contact_pizzerias WHERE contact_id = ?").run(req.params.id);
    const ins = db.prepare("INSERT OR IGNORE INTO contact_pizzerias (contact_id, pizzeria_id) VALUES (?, ?)");
    for (const pid of pizzeria_ids) ins.run(req.params.id, pid);
  }
  const contact = db.prepare("SELECT id, position, name, phone, email FROM contacts WHERE id = ?").get(req.params.id);
  res.json({ ...contact, pizzerias: getContactPizzerias.all(req.params.id) });
});

app.delete('/api/contacts/:id', authMiddleware, requirePerm('contacts', true), (req, res) => {
  db.prepare("DELETE FROM contacts WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ── Rates ──────────────────────────────────────────────────────────────────────
// Migrate existing DB: add columns added after initial schema
try { db.exec("ALTER TABLE rates ADD COLUMN category TEXT NOT NULL DEFAULT 'кухня'"); } catch {}
try { db.exec("ALTER TABLE rates ADD COLUMN rate_per_order INTEGER");                 } catch {}
try { db.exec("ALTER TABLE rates ADD COLUMN rate_per_km INTEGER");                   } catch {}

app.get('/api/pizzerias/:pizzeriaId/rates', authMiddleware, requirePizzeriaAccess, requirePerm('rates'), (req, res) => {
  res.json(db.prepare("SELECT * FROM rates WHERE pizzeria_id = ? ORDER BY category, position").all(req.pizzeriaId));
});

app.post('/api/pizzerias/:pizzeriaId/rates', authMiddleware, requirePizzeriaAccess, requirePerm('rates', true), (req, res) => {
  const { category, position, hourly_rate, monthly_salary, rate_per_order, rate_per_km, notes } = req.body;
  if (!position) return res.status(400).json({ error: 'position обязателен' });
  const r = db.prepare(
    "INSERT INTO rates (pizzeria_id, category, position, hourly_rate, monthly_salary, rate_per_order, rate_per_km, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(req.pizzeriaId, category || 'кухня', position, hourly_rate ?? null, monthly_salary ?? null, rate_per_order ?? null, rate_per_km ?? null, notes || null);
  res.status(201).json(db.prepare("SELECT * FROM rates WHERE id = ?").get(r.lastInsertRowid));
});

app.put('/api/pizzerias/:pizzeriaId/rates/:id', authMiddleware, requirePizzeriaAccess, requirePerm('rates', true), (req, res) => {
  const row = db.prepare("SELECT id FROM rates WHERE id = ? AND pizzeria_id = ?").get(req.params.id, req.pizzeriaId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const { category, position, hourly_rate, monthly_salary, rate_per_order, rate_per_km, notes } = req.body;
  db.prepare("UPDATE rates SET category=?, position=?, hourly_rate=?, monthly_salary=?, rate_per_order=?, rate_per_km=?, notes=? WHERE id=?")
    .run(category || 'кухня', position, hourly_rate ?? null, monthly_salary ?? null, rate_per_order ?? null, rate_per_km ?? null, notes || null, req.params.id);
  res.json(db.prepare("SELECT * FROM rates WHERE id = ?").get(req.params.id));
});

app.delete('/api/pizzerias/:pizzeriaId/rates/:id', authMiddleware, requirePizzeriaAccess, requirePerm('rates', true), (req, res) => {
  const row = db.prepare("SELECT id FROM rates WHERE id = ? AND pizzeria_id = ?").get(req.params.id, req.pizzeriaId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare("DELETE FROM rates WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ── Credentials ────────────────────────────────────────────────────────────────

app.get('/api/pizzerias/:pizzeriaId/credentials', authMiddleware, requirePizzeriaAccess, requirePerm('credentials'), (req, res) => {
  res.json(db.prepare("SELECT * FROM credentials WHERE pizzeria_id = ? ORDER BY service_name").all(req.pizzeriaId));
});

app.post('/api/pizzerias/:pizzeriaId/credentials', authMiddleware, requirePizzeriaAccess, requirePerm('credentials', true), (req, res) => {
  const { service_name, login, password, url, notes } = req.body;
  if (!service_name) return res.status(400).json({ error: 'service_name обязателен' });
  const r = db.prepare(
    "INSERT INTO credentials (pizzeria_id, service_name, login, password, url, notes) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(req.pizzeriaId, service_name, login || null, password || null, url || null, notes || null);
  res.status(201).json(db.prepare("SELECT * FROM credentials WHERE id = ?").get(r.lastInsertRowid));
});

app.put('/api/pizzerias/:pizzeriaId/credentials/:id', authMiddleware, requirePizzeriaAccess, requirePerm('credentials', true), (req, res) => {
  const row = db.prepare("SELECT id FROM credentials WHERE id = ? AND pizzeria_id = ?").get(req.params.id, req.pizzeriaId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const { service_name, login, password, url, notes } = req.body;
  db.prepare("UPDATE credentials SET service_name=?, login=?, password=?, url=?, notes=? WHERE id=?")
    .run(service_name, login || null, password || null, url || null, notes || null, req.params.id);
  res.json(db.prepare("SELECT * FROM credentials WHERE id = ?").get(req.params.id));
});

app.delete('/api/pizzerias/:pizzeriaId/credentials/:id', authMiddleware, requirePizzeriaAccess, requirePerm('credentials', true), (req, res) => {
  const row = db.prepare("SELECT id FROM credentials WHERE id = ? AND pizzeria_id = ?").get(req.params.id, req.pizzeriaId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare("DELETE FROM credentials WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ── Motivation ─────────────────────────────────────────────────────────────────

app.get('/api/pizzerias/:pizzeriaId/motivation', authMiddleware, requirePizzeriaAccess, requirePerm('motivation'), (req, res) => {
  res.json(db.prepare("SELECT * FROM motivation WHERE pizzeria_id = ? ORDER BY metric_name").all(req.pizzeriaId));
});

app.post('/api/pizzerias/:pizzeriaId/motivation', authMiddleware, requirePizzeriaAccess, requirePerm('motivation', true), (req, res) => {
  const { metric_name, threshold, bonus_amount, description, is_active } = req.body;
  if (!metric_name || threshold == null || bonus_amount == null) {
    return res.status(400).json({ error: 'metric_name, threshold, bonus_amount обязательны' });
  }
  const r = db.prepare(
    "INSERT INTO motivation (pizzeria_id, metric_name, threshold, bonus_amount, description, is_active) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(req.pizzeriaId, metric_name, threshold, bonus_amount, description || null, is_active != null ? (is_active ? 1 : 0) : 1);
  res.status(201).json(db.prepare("SELECT * FROM motivation WHERE id = ?").get(r.lastInsertRowid));
});

app.put('/api/pizzerias/:pizzeriaId/motivation/:id', authMiddleware, requirePizzeriaAccess, requirePerm('motivation', true), (req, res) => {
  const row = db.prepare("SELECT id FROM motivation WHERE id = ? AND pizzeria_id = ?").get(req.params.id, req.pizzeriaId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const { metric_name, threshold, bonus_amount, description, is_active } = req.body;
  db.prepare("UPDATE motivation SET metric_name=?, threshold=?, bonus_amount=?, description=?, is_active=? WHERE id=?")
    .run(metric_name, threshold, bonus_amount, description || null, is_active ? 1 : 0, req.params.id);
  res.json(db.prepare("SELECT * FROM motivation WHERE id = ?").get(req.params.id));
});

app.delete('/api/pizzerias/:pizzeriaId/motivation/:id', authMiddleware, requirePizzeriaAccess, requirePerm('motivation', true), (req, res) => {
  const row = db.prepare("SELECT id FROM motivation WHERE id = ? AND pizzeria_id = ?").get(req.params.id, req.pizzeriaId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare("DELETE FROM motivation WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ── Permissions API ────────────────────────────────────────────────────────────
const CONFIGURABLE_RESOURCES = ['contacts','rates','credentials','motivation','pizzerias','schedules_own','schedules_all'];
const CONFIGURABLE_ROLES     = ['management','manager','shift_manager'];

app.get('/api/permissions', authMiddleware, requireRole('superadmin'), (req, res) => {
  res.json(db.prepare("SELECT role, resource, can_read, can_write FROM role_permissions ORDER BY role, resource").all());
});

app.get('/api/permissions/my', authMiddleware, (req, res) => {
  if (req.user.role === 'superadmin') {
    return res.json(CONFIGURABLE_RESOURCES.map(r => ({ resource: r, can_read: 1, can_write: 1 })));
  }
  res.json(db.prepare("SELECT resource, can_read, can_write FROM role_permissions WHERE role = ?").all(req.user.role));
});

app.put('/api/permissions', authMiddleware, requireRole('superadmin'), (req, res) => {
  const { role, resource, can_read, can_write } = req.body;
  if (!CONFIGURABLE_ROLES.includes(role) || !CONFIGURABLE_RESOURCES.includes(resource)) {
    return res.status(400).json({ error: 'Invalid role or resource' });
  }
  // Write implies read; can't write without read
  const read  = can_read  ? 1 : 0;
  const write = can_write ? 1 : 0;
  const finalRead = (write ? 1 : read);
  db.prepare(`
    INSERT INTO role_permissions (role, resource, can_read, can_write) VALUES (?, ?, ?, ?)
    ON CONFLICT(role, resource) DO UPDATE SET can_read=excluded.can_read, can_write=excluded.can_write
  `).run(role, resource, finalRead, write);
  res.json({ success: true });
});

app.put('/api/users/:id/role', authMiddleware, requireRole('superadmin'), (req, res) => {
  const { role } = req.body;
  if (!['superadmin','management','manager','shift_manager'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  const current = db.prepare("SELECT role FROM users WHERE id = ?").get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Not found' });
  if (current.role === 'superadmin' && role !== 'superadmin') {
    const cnt = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'superadmin'").get().c;
    if (cnt <= 1) return res.status(400).json({ error: 'Нельзя убрать роль последнего суперадмина' });
  }
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, req.params.id);
  res.json(fmtUser(db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id)));
});

// ── Schedules ──────────────────────────────────────────────────────────────────
db.exec(`CREATE TABLE IF NOT EXISTS schedules (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start TEXT NOT NULL,
  day        INTEGER NOT NULL,
  start_time TEXT,
  end_time   TEXT,
  UNIQUE(user_id, week_start, day)
)`);

app.get('/api/schedules', authMiddleware, (req, res) => {
  const week = req.query.week;
  if (!week || !/^\d{4}-\d{2}-\d{2}$/.test(week)) {
    return res.status(400).json({ error: 'week required (YYYY-MM-DD)' });
  }
  const role = req.user.role;
  if (role === 'superadmin' || role === 'management') {
    const managers = db.prepare(`
      SELECT u.id, u.name,
        (SELECT p.name FROM pizzerias p WHERE p.manager_id = u.id AND p.is_archived = 0 LIMIT 1) AS pizzeria_name
      FROM users u WHERE u.role = 'manager' ORDER BY u.name
    `).all();
    const getE = db.prepare(
      "SELECT day, start_time, end_time FROM schedules WHERE user_id = ? AND week_start = ? ORDER BY day"
    );
    return res.json(managers.map(m => ({
      user_id: m.id, user_name: m.name, pizzeria_name: m.pizzeria_name,
      entries: getE.all(m.id, week),
    })));
  }
  const entries = db.prepare(
    "SELECT day, start_time, end_time FROM schedules WHERE user_id = ? AND week_start = ? ORDER BY day"
  ).all(req.user.id, week);
  res.json([{ user_id: req.user.id, entries }]);
});

app.put('/api/schedules', authMiddleware, (req, res) => {
  const week = req.query.week;
  if (!week || !/^\d{4}-\d{2}-\d{2}$/.test(week)) {
    return res.status(400).json({ error: 'week required' });
  }
  const { entries } = req.body;
  if (!Array.isArray(entries)) return res.status(400).json({ error: 'entries required' });
  const upsert = db.prepare(`
    INSERT INTO schedules (user_id, week_start, day, start_time, end_time)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, week_start, day) DO UPDATE SET start_time=excluded.start_time, end_time=excluded.end_time
  `);
  db.transaction(() => {
    for (const e of entries) {
      if (typeof e.day === 'number' && e.day >= 0 && e.day <= 6) {
        upsert.run(req.user.id, week, e.day, e.start_time || null, e.end_time || null);
      }
    }
  })();
  const saved = db.prepare(
    "SELECT day, start_time, end_time FROM schedules WHERE user_id = ? AND week_start = ? ORDER BY day"
  ).all(req.user.id, week);
  res.json(saved);
});

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[server] PiX backend running on port ${PORT}`);
});

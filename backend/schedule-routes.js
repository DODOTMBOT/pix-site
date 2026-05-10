/**
 * PiX Schedule Routes
 * В server.js после registerAuthRoutes добавь:
 *
 *   const { registerScheduleRoutes } = require('./schedule-routes');
 *   registerScheduleRoutes(app, db);
 */

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'pix-secret-key-change-in-production';

function registerScheduleRoutes(app, db) {

  // ─── Migration ────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS pix_schedule (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      week         TEXT NOT NULL,
      pizzeria     TEXT NOT NULL,
      employee     TEXT NOT NULL,
      shifts       TEXT NOT NULL DEFAULT '{}',
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(week, pizzeria, employee)
    )
  `);

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

  function requireManagement(req, res, next) {
    if (!['superadmin', 'management'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  }

  // ─── GET /api/schedule ────────────────────────────────────────────────────
  // ?week=2026-W19&pizzeria=ТЦ+Галерея
  app.get('/api/schedule', authMiddleware, (req, res) => {
    const { week, pizzeria } = req.query;
    if (!week || !pizzeria) return res.status(400).json({ error: 'week и pizzeria обязательны' });

    const rows = db.prepare(
      'SELECT * FROM pix_schedule WHERE week = ? AND pizzeria = ? ORDER BY employee'
    ).all(week, pizzeria);

    res.json(rows.map(r => ({ ...r, shifts: JSON.parse(r.shifts) })));
  });

  // ─── GET /api/schedule/overview ───────────────────────────────────────────
  // ?week=2026-W19  — management only, returns all pizzerias
  app.get('/api/schedule/overview', authMiddleware, requireManagement, (req, res) => {
    const { week } = req.query;
    if (!week) return res.status(400).json({ error: 'week обязателен' });

    const rows = db.prepare(
      'SELECT * FROM pix_schedule WHERE week = ? ORDER BY pizzeria, employee'
    ).all(week);

    res.json(rows.map(r => ({ ...r, shifts: JSON.parse(r.shifts) })));
  });

  // ─── POST /api/schedule ───────────────────────────────────────────────────
  // { week, pizzeria, employee, shifts: { mon: {start, end, off}, ... } }
  app.post('/api/schedule', authMiddleware, (req, res) => {
    const { week, pizzeria, employee, shifts } = req.body;
    if (!week || !pizzeria || !employee || !shifts) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }

    const shiftsJson = JSON.stringify(shifts);
    const existing = db.prepare(
      'SELECT id FROM pix_schedule WHERE week = ? AND pizzeria = ? AND employee = ?'
    ).get(week, pizzeria, employee);

    if (existing) {
      db.prepare('UPDATE pix_schedule SET shifts = ? WHERE id = ?').run(shiftsJson, existing.id);
      res.json({ success: true, id: existing.id });
    } else {
      const result = db.prepare(
        'INSERT INTO pix_schedule (week, pizzeria, employee, shifts) VALUES (?, ?, ?, ?)'
      ).run(week, pizzeria, employee, shiftsJson);
      res.json({ success: true, id: result.lastInsertRowid });
    }
  });

  // ─── DELETE /api/schedule/:id ─────────────────────────────────────────────
  app.delete('/api/schedule/:id', authMiddleware, requireManagement, (req, res) => {
    const row = db.prepare('SELECT id FROM pix_schedule WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM pix_schedule WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  console.log('[schedule] Routes registered');
}

module.exports = { registerScheduleRoutes };

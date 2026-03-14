const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const FIXED_RESIDENTS = [
  { name: 'Tomasz', email: 'tomasz@wg.local', color: '#7aa6ff' },
  { name: 'Finn', email: 'finn@wg.local', color: '#89dfc8' },
  { name: 'Nele', email: 'nele@wg.local', color: '#f4b773' },
  { name: 'Leila', email: 'leila@wg.local', color: '#d79cff' },
];

const START_TASK_TYPES = ['Müll rausbringen', 'Küche aufräumen', 'Staubsaugen'];

const FIXED_WASTE_SCHEDULE_2026 = [
  { date: '2026-01-02', type: 'Restmüll' },
  { date: '2026-01-03', type: 'Gelber Sack / Altpapier' },
  { date: '2026-01-14', type: 'Restmüll' },
  { date: '2026-01-15', type: 'Gelber Sack' },
  { date: '2026-01-28', type: 'Restmüll' },
  { date: '2026-01-29', type: 'Gelber Sack / Altpapier' },
  { date: '2026-03-11', type: 'Restmüll' },
  { date: '2026-03-12', type: 'Gelber Sack' },
  { date: '2026-03-25', type: 'Restmüll' },
  { date: '2026-03-26', type: 'Gelber Sack / Altpapier' },
  { date: '2026-05-06', type: 'Restmüll' },
  { date: '2026-05-07', type: 'Gelber Sack' },
  { date: '2026-05-20', type: 'Restmüll' },
  { date: '2026-05-21', type: 'Gelber Sack / Altpapier' },
  { date: '2026-07-01', type: 'Restmüll' },
  { date: '2026-07-02', type: 'Gelber Sack' },
  { date: '2026-07-15', type: 'Restmüll' },
  { date: '2026-07-16', type: 'Gelber Sack / Altpapier' },
  { date: '2026-07-29', type: 'Restmüll' },
  { date: '2026-07-30', type: 'Gelber Sack' },
  { date: '2026-09-09', type: 'Restmüll' },
  { date: '2026-09-10', type: 'Gelber Sack / Altpapier' },
  { date: '2026-09-23', type: 'Restmüll' },
  { date: '2026-09-24', type: 'Gelber Sack' },
  { date: '2026-11-04', type: 'Restmüll' },
  { date: '2026-11-05', type: 'Gelber Sack / Altpapier' },
  { date: '2026-11-18', type: 'Restmüll' },
  { date: '2026-11-19', type: 'Gelber Sack' },
];

const dataDir = path.resolve(__dirname, '../../data');
const dbPath = path.join(dataDir, 'wg-hub.db');

let db;

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function getCurrentWeekStartIso() {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = utc.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + diffToMonday);
  return toIsoDate(utc);
}

function openDatabase() {
  if (db) return db;

  fs.mkdirSync(dataDir, { recursive: true });
  db = new sqlite3.Database(dbPath);

  return db;
}

function run(query, params = []) {
  const database = openDatabase();
  return new Promise((resolve, reject) => {
    database.run(query, params, function onRun(err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function getAll(query, params = []) {
  const database = openDatabase();
  return new Promise((resolve, reject) => {
    database.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function getOne(query, params = []) {
  const database = openDatabase();
  return new Promise((resolve, reject) => {
    database.get(query, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

async function ensureColumn(tableName, columnName, sqlType) {
  const columns = await getAll(`PRAGMA table_info(${tableName})`);
  const hasColumn = columns.some((column) => column.name === columnName);

  if (!hasColumn) {
    await run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${sqlType}`);
  }
}

async function initializeDatabase() {
  await run('PRAGMA journal_mode = WAL');
  await run('PRAGMA foreign_keys = ON');

  await run(`
    CREATE TABLE IF NOT EXISTS residents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      color TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await run(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_residents_name_unique ON residents(name)'
  );

  await run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      due_date TEXT,
      resident_id INTEGER,
      assigned_to TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE SET NULL
    )
  `);

  // Keep backward compatibility for DB files created before the model extension.
  await ensureColumn('tasks', 'description', 'TEXT');
  await ensureColumn('tasks', 'resident_id', 'INTEGER');

  await run(`
    CREATE TABLE IF NOT EXISTS absences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resident_id INTEGER,
      person TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE SET NULL
    )
  `);

  await ensureColumn('absences', 'resident_id', 'INTEGER');

  await run(`
    CREATE TABLE IF NOT EXISTS waste_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await run(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_waste_dates_type_date_unique ON waste_dates(type, date)'
  );

  await run(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      duration_days INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await ensureColumn('calendar_events', 'description', 'TEXT');
  await ensureColumn('calendar_events', 'duration_days', 'INTEGER NOT NULL DEFAULT 1');

  await run(`
    CREATE TABLE IF NOT EXISTS task_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      cycle TEXT NOT NULL CHECK (cycle IN ('once', 'weekly', 'monthly')),
      one_time_date TEXT,
      day_of_month INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await ensureColumn('task_types', 'description', 'TEXT');

  await run(`
    CREATE TABLE IF NOT EXISTS task_type_residents (
      task_type_id INTEGER NOT NULL,
      resident_id INTEGER NOT NULL,
      PRIMARY KEY (task_type_id, resident_id),
      FOREIGN KEY (task_type_id) REFERENCES task_types(id) ON DELETE CASCADE,
      FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS weekly_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL,
      task_type_id INTEGER NOT NULL,
      resident_id INTEGER,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (week_start, task_type_id),
      FOREIGN KEY (task_type_id) REFERENCES task_types(id) ON DELETE CASCADE,
      FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE SET NULL
    )
  `);

  await ensureColumn('weekly_assignments', 'details', 'TEXT');

  await run(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await run('INSERT OR IGNORE INTO app_meta (key, value) VALUES (?, ?)', [
    'statsStartWeek',
    getCurrentWeekStartIso(),
  ]);

  for (const resident of FIXED_RESIDENTS) {
    await run('INSERT OR IGNORE INTO residents (name, email, color) VALUES (?, ?, ?)', [
      resident.name,
      resident.email,
      resident.color,
    ]);

    await run('UPDATE residents SET email = ?, color = ? WHERE name = ?', [
      resident.email,
      resident.color,
      resident.name,
    ]);
  }

  // In diesem Stand arbeiten wir bewusst nur mit den vier festen Bewohnern.
  await run(
    `DELETE FROM residents WHERE name NOT IN (?, ?, ?, ?)`,
    FIXED_RESIDENTS.map((resident) => resident.name)
  );

  const residents = await getAll('SELECT id, name FROM residents ORDER BY id ASC');
  const allResidentIds = residents.map((resident) => resident.id);

  const taskTypeCount = await getOne('SELECT COUNT(*) AS total FROM task_types');
  if (taskTypeCount.total === 0) {
    for (const taskName of START_TASK_TYPES) {
      const created = await run(
        `
          INSERT INTO task_types (name, cycle, one_time_date, day_of_month)
          VALUES (?, 'weekly', NULL, NULL)
        `,
        [taskName]
      );

      for (const residentId of allResidentIds) {
        await run(
          'INSERT OR IGNORE INTO task_type_residents (task_type_id, resident_id) VALUES (?, ?)',
          [created.id, residentId]
        );
      }
    }
  }

  const absencesCount = await getOne('SELECT COUNT(*) AS total FROM absences');
  if (absencesCount.total === 0) {
    await run(
      `INSERT INTO absences (resident_id, person, start_date, end_date, note) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)`,
      [
        residents[0] ? residents[0].id : null,
        residents[0] ? residents[0].name : 'Tomasz',
        '2026-03-16',
        '2026-03-20',
        'Dienstreise',
        residents[1] ? residents[1].id : null,
        residents[1] ? residents[1].name : 'Finn',
        '2026-03-18',
        '2026-03-19',
        'Besuch bei Familie',
      ]
    );
  }

  await run('DELETE FROM waste_dates');
  for (const wasteDate of FIXED_WASTE_SCHEDULE_2026) {
    await run('INSERT OR IGNORE INTO waste_dates (type, date, note) VALUES (?, ?, ?)', [
      wasteDate.type,
      wasteDate.date,
      null,
    ]);
  }
}

module.exports = {
  initializeDatabase,
  run,
  getAll,
  getOne,
};



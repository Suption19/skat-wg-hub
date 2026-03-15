const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();

const FIXED_RESIDENTS = [
  { name: 'Tomasz', email: 'tomasz@wg.local', color: '#7aa6ff' },
  { name: 'Finn', email: 'finn@wg.local', color: '#89dfc8' },
  { name: 'Nele', email: 'nele@wg.local', color: '#f4b773' },
  { name: 'Leila', email: 'leila@wg.local', color: '#d79cff' },
];

const START_TASK_TYPES = ['Müll rausbringen', 'Küche aufräumen', 'Staubsaugen'];
const DEFAULT_PASSWORD = '123';

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

function createPasswordHashSync(password) {
  const iterations = 120000;
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto
    .pbkdf2Sync(String(password), salt, iterations, 32, 'sha256')
    .toString('hex');
  return `${iterations}$${salt}$${derived}`;
}

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

async function migrateTaskTypesCycleConstraintIfNeeded() {
  const tableInfo = await getOne(
    `
      SELECT sql
      FROM sqlite_master
      WHERE type = 'table' AND name = 'task_types'
    `
  );

  const createSql = String((tableInfo && tableInfo.sql) || '').toLowerCase();
  if (createSql.includes("'biweekly'")) {
    return;
  }

  await run('PRAGMA foreign_keys = OFF');
  try {
    await run('ALTER TABLE task_types RENAME TO task_types_old');

    await run(`
      CREATE TABLE task_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        cycle TEXT NOT NULL CHECK (cycle IN ('once', 'weekly', 'biweekly', 'monthly')),
        one_time_date TEXT,
        day_of_month INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await run(`
      INSERT INTO task_types (id, name, description, cycle, one_time_date, day_of_month, is_active, created_at)
      SELECT id, name, description, cycle, one_time_date, day_of_month, is_active, created_at
      FROM task_types_old
    `);

    await run('DROP TABLE task_types_old');
  } finally {
    await run('PRAGMA foreign_keys = ON');
  }
}

async function repairTaskTypeForeignKeysIfNeeded() {
  const taskTypeResidentsInfo = await getOne(
    `
      SELECT sql
      FROM sqlite_master
      WHERE type = 'table' AND name = 'task_type_residents'
    `
  );
  const weeklyAssignmentsInfo = await getOne(
    `
      SELECT sql
      FROM sqlite_master
      WHERE type = 'table' AND name = 'weekly_assignments'
    `
  );

  const hasBrokenTaskTypeResidentsRef = String(
    (taskTypeResidentsInfo && taskTypeResidentsInfo.sql) || ''
  )
    .toLowerCase()
    .includes('task_types_old');
  const hasBrokenWeeklyAssignmentsRef = String(
    (weeklyAssignmentsInfo && weeklyAssignmentsInfo.sql) || ''
  )
    .toLowerCase()
    .includes('task_types_old');

  if (!hasBrokenTaskTypeResidentsRef && !hasBrokenWeeklyAssignmentsRef) {
    return;
  }

  const weeklyColumns = await getAll('PRAGMA table_info(weekly_assignments)');
  const weeklyHasDetails = weeklyColumns.some((column) => column.name === 'details');

  await run('PRAGMA foreign_keys = OFF');
  try {
    if (hasBrokenTaskTypeResidentsRef) {
      await run('ALTER TABLE task_type_residents RENAME TO task_type_residents_old');
      await run(`
        CREATE TABLE task_type_residents (
          task_type_id INTEGER NOT NULL,
          resident_id INTEGER NOT NULL,
          PRIMARY KEY (task_type_id, resident_id),
          FOREIGN KEY (task_type_id) REFERENCES task_types(id) ON DELETE CASCADE,
          FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
        )
      `);
      await run(`
        INSERT OR IGNORE INTO task_type_residents (task_type_id, resident_id)
        SELECT task_type_id, resident_id
        FROM task_type_residents_old
      `);
      await run('DROP TABLE task_type_residents_old');
    }

    if (hasBrokenWeeklyAssignmentsRef) {
      await run('ALTER TABLE weekly_assignments RENAME TO weekly_assignments_old');
      await run(`
        CREATE TABLE weekly_assignments (
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

      const detailsSelection = weeklyHasDetails ? 'details' : 'NULL';
      await run(`
        INSERT INTO weekly_assignments (
          id,
          week_start,
          task_type_id,
          resident_id,
          details,
          status,
          created_at
        )
        SELECT
          id,
          week_start,
          task_type_id,
          resident_id,
          ${detailsSelection},
          status,
          created_at
        FROM weekly_assignments_old
      `);
      await run('DROP TABLE weekly_assignments_old');
    }
  } finally {
    await run('PRAGMA foreign_keys = ON');
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
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      resident_id INTEGER,
      must_change_password INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE SET NULL
    )
  `);

  await ensureColumn('users', 'resident_id', 'INTEGER');
  await ensureColumn('users', 'must_change_password', 'INTEGER NOT NULL DEFAULT 1');

  await run(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await run(
    'CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id)'
  );

  await run(
    'CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at)'
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
    CREATE TABLE IF NOT EXISTS shopping_list_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS skat_games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished')),
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS skat_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      round_no INTEGER NOT NULL,
      resident_id INTEGER,
      player_name TEXT NOT NULL,
      points INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (game_id) REFERENCES skat_games(id) ON DELETE CASCADE,
      FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE SET NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS task_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      cycle TEXT NOT NULL CHECK (cycle IN ('once', 'weekly', 'biweekly', 'monthly')),
      one_time_date TEXT,
      day_of_month INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await migrateTaskTypesCycleConstraintIfNeeded();
  await repairTaskTypeForeignKeysIfNeeded();

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

  for (const resident of FIXED_RESIDENTS) {
    const linkedResident = residents.find((item) => item.name === resident.name);
    if (!linkedResident) continue;

    const existingUser = await getOne(
      'SELECT id, password_hash AS passwordHash FROM users WHERE username = ?',
      [resident.name]
    );

    if (!existingUser) {
      await run(
        `
          INSERT INTO users (username, password_hash, resident_id, must_change_password)
          VALUES (?, ?, ?, 1)
        `,
        [resident.name, createPasswordHashSync(DEFAULT_PASSWORD), linkedResident.id]
      );
      continue;
    }

    if (!existingUser.passwordHash) {
      await run(
        'UPDATE users SET password_hash = ?, resident_id = ? WHERE id = ?',
        [createPasswordHashSync(DEFAULT_PASSWORD), linkedResident.id, existingUser.id]
      );
      continue;
    }

    await run('UPDATE users SET resident_id = ? WHERE id = ?', [
      linkedResident.id,
      existingUser.id,
    ]);
  }

  await run(
    'DELETE FROM users WHERE username NOT IN (?, ?, ?, ?)',
    FIXED_RESIDENTS.map((resident) => resident.name)
  );

  await run('DELETE FROM auth_sessions WHERE expires_at <= datetime(\'now\')');

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



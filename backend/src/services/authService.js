const crypto = require('crypto');

const { getOne, run } = require('../db');

const SESSION_TTL_DAYS = 180;

function createPasswordHash(password) {
  const iterations = 120000;
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto
    .pbkdf2Sync(String(password), salt, iterations, 32, 'sha256')
    .toString('hex');
  return `${iterations}$${salt}$${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;

  const [iterationsRaw, salt, expected] = String(storedHash).split('$');
  const iterations = Number(iterationsRaw);
  if (!iterations || !salt || !expected) return false;

  const actual = crypto
    .pbkdf2Sync(String(password), salt, iterations, 32, 'sha256')
    .toString('hex');

  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(actual, 'hex');
  if (expectedBuffer.length !== actualBuffer.length) return false;

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function toSqlDateTime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

async function getUserByUsername(username) {
  return getOne(
    `
      SELECT
        id,
        username,
        password_hash AS passwordHash,
        resident_id AS residentId,
        must_change_password AS mustChangePassword,
        is_admin AS isAdmin
      FROM users
      WHERE username = ?
    `,
    [username]
  );
}

async function getUserById(id) {
  return getOne(
    `
      SELECT
        u.id,
        u.username,
        u.resident_id AS residentId,
        u.must_change_password AS mustChangePassword,
        u.is_admin AS isAdmin,
        r.name AS residentName
      FROM users u
      LEFT JOIN residents r ON r.id = u.resident_id
      WHERE u.id = ?
    `,
    [id]
  );
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await run(
    `
      INSERT INTO auth_sessions (user_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `,
    [userId, tokenHash, toSqlDateTime(expiresAt)]
  );

  return {
    token,
    expiresAt,
  };
}

async function getSessionByToken(token) {
  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  return getOne(
    `
      SELECT
        s.id,
        s.user_id AS userId,
        s.expires_at AS expiresAt,
        u.username,
        u.resident_id AS residentId,
        u.must_change_password AS mustChangePassword,
        u.is_admin AS isAdmin,
        r.name AS residentName
      FROM auth_sessions s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN residents r ON r.id = u.resident_id
      WHERE s.token_hash = ?
    `,
    [tokenHash]
  );
}

async function deleteSessionByToken(token) {
  if (!token) return;
  await run('DELETE FROM auth_sessions WHERE token_hash = ?', [hashSessionToken(token)]);
}

async function deleteSessionsForUser(userId) {
  await run('DELETE FROM auth_sessions WHERE user_id = ?', [userId]);
}

function isSessionExpired(expiresAt) {
  return Date.parse(String(expiresAt).replace(' ', 'T') + 'Z') <= Date.now();
}

async function changePassword(userId, newPassword) {
  await run(
    `
      UPDATE users
      SET password_hash = ?,
          must_change_password = 0
      WHERE id = ?
    `,
    [createPasswordHash(newPassword), userId]
  );

  return getUserById(userId);
}

async function createUserForResident(residentId, username, isAdmin = false, password = '1234') {
  await run(
    `
      INSERT INTO users (username, password_hash, resident_id, must_change_password, is_admin)
      VALUES (?, ?, ?, ?, ?)
    `,
    [username, createPasswordHash(password), residentId, 1, isAdmin ? 1 : 0]
  );
}

async function register(username, password) {
  const adminCount = await getOne('SELECT COUNT(*) as count FROM users WHERE is_admin = 1');
  const isAdmin = adminCount && adminCount.count === 0;

  const existingUser = await getOne('SELECT id FROM users WHERE username = ?', [username]);
  if (existingUser) {
    throw new Error('Benutzername bereits vergeben.');
  }

  // Create Resident
  const residentResult = await run(
    'INSERT INTO residents (name, color) VALUES (?, ?)',
    [username, '#7aa6ff'] // default color
  );

  // Create User
  await createUserForResident(residentResult.id, username, isAdmin, password);

  // Important: first user doesn't need to change password to log in.
  // Actually, regular users who register themselves shouldn't need to either.
  await run(
    'UPDATE users SET must_change_password = 0 WHERE username = ?',
    [username]
  );

  return getUserByUsername(username);
}

module.exports = {
  SESSION_TTL_DAYS,
  getUserByUsername,
  getUserById,
  verifyPassword,
  createSession,
  getSessionByToken,
  deleteSessionByToken,
  deleteSessionsForUser,
  isSessionExpired,
  changePassword,
  createUserForResident,
  register,
};


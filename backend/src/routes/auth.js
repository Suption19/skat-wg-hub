const express = require('express');

const {
  SESSION_TTL_DAYS,
  getUserByUsername,
  getUserById,
  verifyPassword,
  createSession,
  deleteSessionByToken,
  deleteSessionsForUser,
  changePassword,
  register,
} = require('../services/authService');
const { SESSION_COOKIE_NAME, requireAuth, resolveAuth } = require('../middleware/requireAuth');

const router = express.Router();

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    residentId: user.residentId,
    residentName: user.residentName || user.username,
    mustChangePassword: Boolean(user.mustChangePassword),
    isAdmin: Boolean(user.isAdmin),
  };
}

router.post('/register', async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    if (!username || !password) {
      return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Passwort muss mindestens 4 Zeichen haben' });
    }

    const user = await register(username, password);

    const session = await createSession(user.id);
    res.cookie(SESSION_COOKIE_NAME, session.token, getCookieOptions());

    const publicUser = await getUserById(user.id);
    return res.status(201).json({ user: toPublicUser(publicUser) });
  } catch (error) {
    if (error.message === 'Benutzername bereits vergeben.') {
      return res.status(409).json({ error: error.message });
    }
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    if (!username || !password) {
      return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich' });
    }

    const user = await getUserByUsername(username);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Benutzername oder Passwort ist falsch' });
    }

    const session = await createSession(user.id);
    res.cookie(SESSION_COOKIE_NAME, session.token, getCookieOptions());

    const publicUser = await getUserById(user.id);
    return res.json({ user: toPublicUser(publicUser) });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies ? req.cookies[SESSION_COOKIE_NAME] : null;
    if (token) {
      await deleteSessionByToken(token);
    }

    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

router.get('/me', async (req, res, next) => {
  try {
    const auth = await resolveAuth(req);
    if (!auth) {
      return res.status(401).json({ error: 'Nicht eingeloggt' });
    }

    const user = await getUserById(auth.userId);
    if (!user) {
      return res.status(401).json({ error: 'Nicht eingeloggt' });
    }

    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const oldPassword = String(req.body.oldPassword || '');
    const newPassword = String(req.body.newPassword || '');

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Altes und neues Passwort sind erforderlich' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'Neues Passwort muss mindestens 4 Zeichen haben' });
    }

    const userWithHash = await getUserByUsername(req.auth.username);
    if (!userWithHash || !verifyPassword(oldPassword, userWithHash.passwordHash)) {
      return res.status(400).json({ error: 'Das aktuelle Passwort ist falsch' });
    }

    await changePassword(req.auth.userId, newPassword);

    // Nach Passwortwechsel alte Sessions invalidieren und neue Session ausstellen.
    await deleteSessionsForUser(req.auth.userId);
    const session = await createSession(req.auth.userId);
    res.cookie(SESSION_COOKIE_NAME, session.token, getCookieOptions());

    const updatedUser = await getUserById(req.auth.userId);
    return res.json({ user: toPublicUser(updatedUser) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;


const {
  getSessionByToken,
  deleteSessionByToken,
  isSessionExpired,
} = require('../services/authService');

const SESSION_COOKIE_NAME = 'wg_session';

async function resolveAuth(req) {
  const token = req.cookies ? req.cookies[SESSION_COOKIE_NAME] : null;
  if (!token) return null;

  const session = await getSessionByToken(token);
  if (!session) return null;

  if (isSessionExpired(session.expiresAt)) {
    await deleteSessionByToken(token);
    return null;
  }

  return {
    sessionId: session.id,
    userId: session.userId,
    username: session.username,
    residentId: session.residentId,
    residentName: session.residentName,
    mustChangePassword: Boolean(session.mustChangePassword),
    token,
  };
}

async function requireAuth(req, res, next) {
  try {
    const auth = await resolveAuth(req);
    if (!auth) {
      return res.status(401).json({ error: 'Nicht eingeloggt' });
    }

    req.auth = auth;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  SESSION_COOKIE_NAME,
  requireAuth,
  resolveAuth,
};


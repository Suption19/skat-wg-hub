const { getAll, getOne, run } = require('../db');

function mapEntryPayload(payload = {}) {
  const residentId = payload.residentId ? Number(payload.residentId) : null;
  const guestName = payload.guestName ? String(payload.guestName).trim() : '';
  const points = Number(payload.points);

  return {
    residentId: Number.isInteger(residentId) ? residentId : null,
    guestName,
    points,
  };
}

function withMedals(items) {
  const medals = ['gold', 'silver', 'bronze'];
  return items.map((item, index) => ({
    ...item,
    medal: medals[index] || null,
    rank: index + 1,
  }));
}

async function getActiveGame() {
  return getOne(
    `
      SELECT id, status, started_at AS startedAt, finished_at AS finishedAt
      FROM skat_games
      WHERE status = 'active'
      ORDER BY id DESC
      LIMIT 1
    `
  );
}

async function getGameById(id) {
  return getOne(
    `
      SELECT id, status, started_at AS startedAt, finished_at AS finishedAt
      FROM skat_games
      WHERE id = ?
    `,
    [id]
  );
}

async function listGameEntries(gameId) {
  return getAll(
    `
      SELECT
        se.id,
        se.game_id AS gameId,
        se.round_no AS roundNo,
        se.resident_id AS residentId,
        se.player_name AS playerName,
        se.points,
        se.created_at AS createdAt,
        r.name AS residentName
      FROM skat_entries se
      LEFT JOIN residents r ON r.id = se.resident_id
      WHERE se.game_id = ?
      ORDER BY se.round_no ASC, se.id ASC
    `,
    [gameId]
  );
}

function buildGameTotals(entries) {
  const totals = new Map();

  for (const entry of entries) {
    const label = String(entry.residentName || entry.playerName || 'Gast').trim();
    const normalized = label.toLocaleLowerCase('de-DE');
    const key = `player-${normalized}`;

    if (!totals.has(key)) {
      totals.set(key, {
        key,
        residentId: entry.residentId || null,
        playerName: label,
        totalPoints: 0,
      });
    }

    const current = totals.get(key);
    // Behalte vorhandene Resident-ID bei oder uebernehme sie spaeter, falls zuerst ein Gast-Eintrag kam.
    if (!current.residentId && entry.residentId) {
      current.residentId = entry.residentId;
    }
    current.totalPoints += entry.points;
  }

  return Array.from(totals.values()).sort((a, b) => b.totalPoints - a.totalPoints);
}

function buildParticipants(entries) {
  const unique = new Map();

  for (const entry of entries) {
    const label = String(entry.residentName || entry.playerName || '').trim();
    if (label) {
      const normalized = label.toLocaleLowerCase('de-DE');
      if (!unique.has(normalized)) {
        unique.set(normalized, label);
      }
    }
  }

  return Array.from(unique.values()).sort((a, b) => a.localeCompare(b, 'de'));
}

function mapGameWithDetails(game, entries) {
  return {
    ...game,
    entries,
    participants: buildParticipants(entries),
    totals: buildGameTotals(entries),
  };
}

async function countGameEntries(gameId) {
  const result = await getOne(
    'SELECT COUNT(*) AS total FROM skat_entries WHERE game_id = ?',
    [gameId]
  );
  return Number(result && result.total) || 0;
}

async function listFinishedGames() {
  const games = await getAll(
    `
      SELECT id, status, started_at AS startedAt, finished_at AS finishedAt
      FROM skat_games
      WHERE status = 'finished'
      ORDER BY finished_at DESC, id DESC
    `
  );

  const withEntries = [];
  for (const game of games) {
    const entries = await listGameEntries(game.id);
    withEntries.push(mapGameWithDetails(game, entries));
  }

  return withEntries;
}

async function getAllTimeScores() {
  const rows = await getAll(
    `
      SELECT
        r.id AS residentId,
        r.name AS residentName,
        COALESCE(SUM(CASE WHEN sg.id IS NOT NULL THEN se.points ELSE 0 END), 0) AS totalPoints
      FROM residents r
      LEFT JOIN skat_entries se
        ON se.resident_id = r.id
      LEFT JOIN skat_games sg
        ON sg.id = se.game_id
       AND sg.status = 'finished'
      GROUP BY r.id
      ORDER BY totalPoints DESC, r.id ASC
    `
  );

  return withMedals(
    rows.map((row) => ({
      residentId: row.residentId,
      residentName: row.residentName,
      totalPoints: Number(row.totalPoints) || 0,
    }))
  );
}

async function getSkatOverview() {
  const [allTime, activeGame, finishedGames] = await Promise.all([
    getAllTimeScores(),
    getActiveGame(),
    listFinishedGames(),
  ]);

  let active = null;
  if (activeGame) {
    const entries = await listGameEntries(activeGame.id);
    active = mapGameWithDetails(activeGame, entries);
  }

  return {
    allTime,
    activeGame: active,
    finishedGames,
  };
}

async function startSkatGame() {
  const existing = await getActiveGame();
  if (existing) return existing;

  const result = await run(
    `
      INSERT INTO skat_games (status)
      VALUES ('active')
    `
  );

  return getGameById(result.id);
}

async function addSkatEntry(gameId, payload) {
  const game = await getGameById(gameId);
  if (!game) {
    throw new Error('Skat-Spiel nicht gefunden');
  }
  if (game.status !== 'active') {
    throw new Error('Nur aktive Spiele können Punkte erhalten');
  }

  const entry = mapEntryPayload(payload);
  if (!Number.isInteger(entry.points)) {
    throw new Error('points muss eine ganze Zahl sein');
  }

  let playerName = entry.guestName;
  if (entry.residentId) {
    const resident = await getOne('SELECT id, name FROM residents WHERE id = ?', [entry.residentId]);
    if (!resident) {
      throw new Error('Bewohner nicht gefunden');
    }
    playerName = resident.name;
  }

  if (!playerName) {
    throw new Error('guestName ist für Gast erforderlich');
  }

  const nextRound = await getOne(
    'SELECT COALESCE(MAX(round_no), 0) + 1 AS nextRound FROM skat_entries WHERE game_id = ?',
    [gameId]
  );

  const result = await run(
    `
      INSERT INTO skat_entries (game_id, round_no, resident_id, player_name, points)
      VALUES (?, ?, ?, ?, ?)
    `,
    [gameId, nextRound.nextRound, entry.residentId, playerName, entry.points]
  );

  return getOne(
    `
      SELECT
        se.id,
        se.game_id AS gameId,
        se.round_no AS roundNo,
        se.resident_id AS residentId,
        se.player_name AS playerName,
        se.points,
        se.created_at AS createdAt,
        r.name AS residentName
      FROM skat_entries se
      LEFT JOIN residents r ON r.id = se.resident_id
      WHERE se.id = ?
    `,
    [result.id]
  );
}

async function finishSkatGame(gameId) {
  const game = await getGameById(gameId);
  if (!game) return null;

  const entryCount = await countGameEntries(gameId);
  if (entryCount === 0) {
    await run('DELETE FROM skat_games WHERE id = ?', [gameId]);
    return {
      id: gameId,
      discarded: true,
    };
  }

  await run(
    `
      UPDATE skat_games
      SET status = 'finished', finished_at = datetime('now')
      WHERE id = ?
    `,
    [gameId]
  );

  return getGameById(gameId);
}

async function deleteSkatGame(gameId) {
  const game = await getGameById(gameId);
  if (!game) return null;

  await run('DELETE FROM skat_games WHERE id = ?', [gameId]);
  return game;
}

module.exports = {
  getSkatOverview,
  startSkatGame,
  addSkatEntry,
  finishSkatGame,
  deleteSkatGame,
};


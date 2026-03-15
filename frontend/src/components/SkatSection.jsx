import { useEffect, useMemo, useState } from 'react';

import { requestJson } from '../api';
import { getResidentVisual } from '../residentVisuals';

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function participantLabel(item) {
  return item.residentName || item.playerName || 'Gast';
}

function SkatSection() {
  const [overview, setOverview] = useState({
    allTime: [],
    activeGame: null,
    finishedGames: [],
  });
  const [entryForm, setEntryForm] = useState({
    player: '',
    guestName: '',
    points: '',
  });
  const [loading, setLoading] = useState(true);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isFinishingGame, setIsFinishingGame] = useState(false);
  const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState(false);
  const [deleteGameCandidate, setDeleteGameCandidate] = useState(null);
  const [isDeletingGame, setIsDeletingGame] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOverview().catch(() => {});
  }, []);

  const playerOptions = useMemo(
    () => [
      ...overview.allTime.map((item) => ({
        value: `resident-${item.residentId}`,
        label: item.residentName,
      })),
      { value: 'guest', label: 'Gast' },
    ],
    [overview.allTime]
  );

  async function loadOverview() {
    setLoading(true);
    try {
      const response = await requestJson('/api/skat/overview');
      setOverview({
        allTime: response.allTime || [],
        activeGame: response.activeGame || null,
        finishedGames: response.finishedGames || [],
      });
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartGame() {
    setIsStartingGame(true);
    try {
      await requestJson('/api/skat/games', { method: 'POST' });
      setEntryForm({ player: '', guestName: '', points: '' });
      await loadOverview();
    } catch (startError) {
      setError(startError.message);
    } finally {
      setIsStartingGame(false);
    }
  }

  async function handleAddEntry(event) {
    event.preventDefault();
    if (!overview.activeGame || !entryForm.player || isSavingEntry) return;

    const payload = {
      points: Number(entryForm.points),
    };

    if (entryForm.player === 'guest') {
      payload.guestName = entryForm.guestName.trim();
    } else {
      payload.residentId = Number(entryForm.player.replace('resident-', ''));
    }

    setIsSavingEntry(true);
    try {
      await requestJson(`/api/skat/games/${overview.activeGame.id}/entries`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setEntryForm((current) => ({
        ...current,
        points: '',
        guestName: '',
      }));
      await loadOverview();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSavingEntry(false);
    }
  }

  async function handleFinishGame() {
    if (!overview.activeGame || isFinishingGame) return;

    setIsFinishingGame(true);
    try {
      await requestJson(`/api/skat/games/${overview.activeGame.id}/finish`, {
        method: 'POST',
      });
      await loadOverview();
    } catch (finishError) {
      setError(finishError.message);
    } finally {
      setIsFinishingGame(false);
    }
  }

  async function handleDeleteGame() {
    if (!deleteGameCandidate || isDeletingGame) return;

    setIsDeletingGame(true);
    try {
      await requestJson(`/api/skat/games/${deleteGameCandidate.id}`, {
        method: 'DELETE',
      });
      setDeleteGameCandidate(null);
      await loadOverview();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setIsDeletingGame(false);
    }
  }

  return (
    <section className="skat-page">
      <section className="card skat-podium-card">
        <div className="section-headline">
          <h2>Skat All-Time</h2>
          <p>Nur die festen WG-Bewohner sind hier im Vergleich.</p>
        </div>

        <div className="skat-podium-grid">
          {overview.allTime.map((item) => {
            const visual = getResidentVisual(item.residentName);
            return (
              <article key={item.residentId} className={`podium-item rank-${item.rank}`}>
                <div className="podium-medal" aria-hidden="true">
                  {item.medal === 'gold' ? '🥇' : item.medal === 'silver' ? '🥈' : item.medal === 'bronze' ? '🥉' : '🏅'}
                </div>
                <span className="podium-avatar" style={{ backgroundColor: visual.color }}>
                  {visual.avatar}
                </span>
                <strong>{item.residentName}</strong>
                <p>{item.totalPoints} Punkte</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card skat-live-card">
        <div className="section-headline">
          <h2>Aktuelles Spiel</h2>
          <p>Trage pro Runde Punkte ein.</p>
        </div>

        {!overview.activeGame ? (
          <button
            type="button"
            className="skat-primary-button"
            onClick={handleStartGame}
            disabled={isStartingGame}
          >
            <span>{isStartingGame ? 'Startet...' : 'Neues Spiel'}</span>
            <b aria-hidden="true">+</b>
          </button>
        ) : (
          <>
            <div className="skat-game-meta">
              <span>Gestartet: {formatDateTime(overview.activeGame.startedAt)}</span>
            </div>

            <form className="skat-entry-form" onSubmit={handleAddEntry}>
              <select
                value={entryForm.player}
                onChange={(event) => setEntryForm((current) => ({ ...current, player: event.target.value }))}
                required
              >
                <option value="">Person wählen</option>
                {playerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {entryForm.player === 'guest' ? (
                <input
                  placeholder="Gastname"
                  value={entryForm.guestName}
                  onChange={(event) =>
                    setEntryForm((current) => ({ ...current, guestName: event.target.value }))
                  }
                  required
                />
              ) : null}

              <input
                type="number"
                step="1"
                placeholder="Punkte (z. B. 50 oder -10)"
                value={entryForm.points}
                onChange={(event) => setEntryForm((current) => ({ ...current, points: event.target.value }))}
                required
              />

              <button type="submit" disabled={isSavingEntry}>
                {isSavingEntry ? 'Speichert...' : 'Speichern'}
              </button>

              <button
                type="button"
                className="skat-finish-button"
                onClick={() => setIsFinishConfirmOpen(true)}
                disabled={isFinishingGame}
              >
                {isFinishingGame ? 'Schließt ab...' : 'Spiel abschließen'}
              </button>
            </form>

            <div className="skat-totals">
              {overview.activeGame.totals && overview.activeGame.totals.length > 0 ? (
                overview.activeGame.totals.map((item) => (
                  <article key={item.key} className="skat-total-item">
                    <strong>{participantLabel(item)}</strong>
                    <span>{item.totalPoints}</span>
                  </article>
                ))
              ) : (
                <p className="task-status-empty">Noch keine Runden erfasst.</p>
              )}
            </div>
          </>
        )}
      </section>

      <section className="card skat-history-card">
        <div className="section-headline">
          <h2>Vergangene Spiele</h2>
          <p>Mit genauen Punkten je Runde.</p>
        </div>

        {loading ? (
          <p className="task-status-empty">Lade Skat-Daten...</p>
        ) : overview.finishedGames.length === 0 ? (
          <p className="task-status-empty">Noch keine beendeten Spiele.</p>
        ) : (
          <div className="skat-games-list">
            {overview.finishedGames.map((game, index) => (
              <article key={game.id} className="skat-game-item">
                <header>
                  <h3>Spiel #{index + 1}</h3>
                  <p>
                    {formatDateTime(game.startedAt)} - {formatDateTime(game.finishedAt)}
                  </p>
                  <p>
                    Mitspieler: {game.participants && game.participants.length > 0
                      ? game.participants.join(', ')
                      : '-'}
                  </p>
                  <button
                    type="button"
                    className="ghost-danger"
                    onClick={() =>
                      setDeleteGameCandidate({
                        ...game,
                        displayNumber: index + 1,
                      })
                    }
                  >
                    Spiel löschen
                  </button>
                </header>

                <div className="skat-round-list">
                  {(game.totals || []).map((item) => (
                    <div key={item.key} className="skat-round-row">
                      <strong>{participantLabel(item)}</strong>
                      <b>{item.totalPoints > 0 ? `+${item.totalPoints}` : item.totalPoints}</b>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {error ? <p className="error-text">{error}</p> : null}

      {isFinishConfirmOpen ? (
        <div
          className="confirm-modal-overlay"
          role="presentation"
          onClick={() => {
            if (!isFinishingGame) {
              setIsFinishConfirmOpen(false);
            }
          }}
        >
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="skat-finish-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="skat-finish-confirm-title">Spiel wirklich abschließen?</h3>
            <p>Danach wird das Spiel in die Historie übernommen und die All-Time-Punkte aktualisiert.</p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="modal-button-secondary"
                onClick={() => setIsFinishConfirmOpen(false)}
                disabled={isFinishingGame}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="event-save-button"
                onClick={async () => {
                  await handleFinishGame();
                  setIsFinishConfirmOpen(false);
                }}
                disabled={isFinishingGame}
              >
                {isFinishingGame ? 'Schließt ab...' : 'Ja, abschließen'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteGameCandidate ? (
        <div
          className="confirm-modal-overlay"
          role="presentation"
          onClick={() => {
            if (!isDeletingGame) {
              setDeleteGameCandidate(null);
            }
          }}
        >
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="skat-delete-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="skat-delete-confirm-title">Spiel wirklich löschen?</h3>
            <p>
              Willst du Spiel #{deleteGameCandidate.displayNumber || '?'} wirklich komplett löschen?
            </p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="modal-button-secondary"
                onClick={() => setDeleteGameCandidate(null)}
                disabled={isDeletingGame}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="modal-button-danger"
                onClick={handleDeleteGame}
                disabled={isDeletingGame}
              >
                {isDeletingGame ? 'Löscht...' : 'Ja, löschen'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default SkatSection;


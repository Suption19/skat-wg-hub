import { useEffect, useState } from 'react';

import { requestJson } from '../api';

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function normalizeWeekStart(input) {
  const base = input ? new Date(`${input}T00:00:00Z`) : new Date();
  const utc = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const day = utc.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + diff);
  return toIsoDate(utc);
}

function shiftWeek(weekStart, deltaWeeks) {
  const date = weekStart ? new Date(`${weekStart}T00:00:00Z`) : new Date();
  date.setUTCDate(date.getUTCDate() + deltaWeeks * 7);
  return normalizeWeekStart(toIsoDate(date));
}

function getIsoWeekLabel(weekStart) {
  if (!weekStart) return 'KW -';
  const date = new Date(`${weekStart}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 3);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const yearStartDay = yearStart.getUTCDay() || 7;
  yearStart.setUTCDate(yearStart.getUTCDate() - yearStartDay + 1);
  const week = Math.floor((date - yearStart) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return `KW ${week}`;
}

function formatDateShort(isoDate) {
  const [year, month, day] = String(isoDate || '').split('-');
  if (!year || !month || !day) return isoDate || '-';
  return `${day}-${month}-${year.slice(2)}`;
}

function getCurrentWeekStart() {
  return normalizeWeekStart();
}

function getCompletionTone(rate) {
  if (rate >= 80) return 'tone-good';
  if (rate >= 50) return 'tone-mid';
  return 'tone-low';
}

function TaskStatusSection() {
  const [weekStart, setWeekStart] = useState(() => normalizeWeekStart());
  const [assignments, setAssignments] = useState([]);
  const [allTimeStats, setAllTimeStats] = useState([]);
  const [allTimeStartWeek, setAllTimeStartWeek] = useState('');
  const [allTimeCutoff, setAllTimeCutoff] = useState('');
  const [loading, setLoading] = useState(true);
  const [allTimeLoading, setAllTimeLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadAllTimeStats() {
      setAllTimeLoading(true);
      try {
        const response = await requestJson(
          `/api/weekly-assignments/stats/all-time?weekStart=${weekStart}`
        );
        if (!mounted) return;

        setAllTimeStats(response.items || []);
        setAllTimeStartWeek(response.startWeek || weekStart);
        setAllTimeCutoff(response.cutoffWeekStart || weekStart);
      } catch (err) {
        if (mounted) {
          setAllTimeStats([]);
          setAllTimeStartWeek('');
          setAllTimeCutoff('');
        }
      } finally {
        if (mounted) {
          setAllTimeLoading(false);
        }
      }
    }

    loadAllTimeStats();

    return () => {
      mounted = false;
    };
  }, [weekStart]);

  useEffect(() => {
    let mounted = true;

    async function loadAssignments() {
      setLoading(true);
      setError('');

      try {
        const response = await requestJson(`/api/weekly-assignments?weekStart=${weekStart}`);
        if (!mounted) return;

        setAssignments(response.items || []);
      } catch (err) {
        if (mounted) {
          setAssignments([]);
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadAssignments();

    return () => {
      mounted = false;
    };
  }, [weekStart]);

  const currentWeekStart = getCurrentWeekStart();
  const isPastWeek = weekStart < currentWeekStart;
  const openCount = assignments.filter((item) => item.status === 'open').length;

  return (
    <div className="task-status-stack">
      <section className="card data-section task-status-page">
        <div className="section-headline">
          <h2>Aufgabenstatus</h2>
          <p>
            Wechsle durch Wochen und sieh direkt, welche Aufgaben offen oder erledigt sind.
          </p>
        </div>

        <div className="status-week-picker">
          <div className="status-week-head">
            <button
              type="button"
              className="status-week-arrow"
              aria-label="Vorherige Woche"
              onClick={() => setWeekStart((prev) => shiftWeek(prev, -1))}
            >
              {'<'}
            </button>
            <p>
              <strong>{getIsoWeekLabel(weekStart)}</strong>
              <span>Woche ab {formatDateShort(weekStart)}</span>
            </p>
            <button
              type="button"
              className="status-week-arrow"
              aria-label="Nächste Woche"
              onClick={() => setWeekStart((prev) => shiftWeek(prev, 1))}
            >
              {'>'}
            </button>
          </div>
          {weekStart !== currentWeekStart ? (
            <button
              type="button"
              className="status-current-week-button"
              onClick={() => setWeekStart(normalizeWeekStart())}
            >
              Diese Woche
            </button>
          ) : null}
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        {isPastWeek && openCount > 0 ? (
          <div className="status-alert">
            Achtung: In dieser vergangenen Woche sind noch {openCount} Aufgabe(n) offen.
          </div>
        ) : null}

        <section className="sub-block">
          <div className="sub-block-head">
            <h3>Aufgaben dieser Woche</h3>
          </div>

          {loading ? (
            <p className="task-status-empty">Lade Aufgaben...</p>
          ) : assignments.length === 0 ? (
            <p className="task-status-empty">Keine Aufgaben in dieser Woche.</p>
          ) : (
            <div className="task-status-list">
              {assignments.map((assignment) => {
                const overdue = isPastWeek && assignment.status === 'open';
                return (
                  <article
                    key={assignment.id}
                    className={`task-status-card ${overdue ? 'overdue' : ''}`}
                  >
                    <div className="task-status-card-head">
                      <h4>{assignment.taskName}</h4>
                      <span className={`status-badge ${assignment.status}`}>
                        {overdue ? 'nicht gemacht' : assignment.status}
                      </span>
                    </div>
                    <p>
                      <strong>Bewohner:</strong> {assignment.residentName || '-'}
                    </p>
                    <p>
                      <strong>Details:</strong> {assignment.details || '-'}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>

      <section className="card data-section all-time-stats-card">
        <div className="all-time-stats-head">
          <h3>Erledigt pro Mitbewohner</h3>
          <p>
            Von {formatDateShort(allTimeStartWeek || currentWeekStart)} bis {formatDateShort(allTimeCutoff || currentWeekStart)}
          </p>
        </div>

        {allTimeLoading ? (
          <p className="task-status-empty">Lade Gesamtstatistik...</p>
        ) : (
          <div className="resident-progress-grid">
            {allTimeStats.map((item) => {
              const rate = item.assigned > 0 ? Math.round((item.done / item.assigned) * 100) : 0;
              const tone = getCompletionTone(rate);
              return (
                <article key={item.residentId} className={`resident-progress-card ${tone}`}>
                  <h4>{item.residentName}</h4>
                  <p>
                    {item.done} von {item.assigned} erledigt
                  </p>
                  <div className={`progress-line ${tone}`} aria-hidden="true">
                    <span style={{ width: `${rate}%` }} />
                  </div>
                  <small>{rate}% erledigt</small>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default TaskStatusSection;



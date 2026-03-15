import { useEffect, useState } from 'react';

import { requestJson } from '../api';
import { getResidentVisual } from '../residentVisuals';

const EVENT_LABELS = {
  muell: 'Müll',
  termin: 'Termin',
  geburtstag: 'Geburtstag',
  abwesenheit: 'Abwesenheit',
};

const FINISHED_TASK_MESSAGES = [
  'Tomasz ist sehr stolz auf dich. Finn hat schon den imaginären Pokal poliert.',
  'Nele vergibt heute 5 von 5 Sternen für deinen WG-Endgegner-Run.',
  'Leila sagt: Das war so gut, sogar der Putzplan hat geklatscht.',
  'Tomasz und Finn diskutieren gerade, wer dir zuerst eine High Five geben darf.',
  'Nele und Leila bestätigen offiziell: Heute bist du WG-MVP.',
  'Die WG-Headline des Tages lautet: Mission erledigt, Chaos vertagt.',
  'Finn meint: So sauber war die Woche zuletzt im Paralleluniversum.',
  'Tomasz nickt zufrieden, Nele lacht, Leila feiert und Finn macht Victory-Dance.',
];

function formatShortDate(isoDate) {
  const [year, month, day] = String(isoDate || '').split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}.${month}.`;
}

function formatWeekStartLabel(isoDate) {
  const [year, month, day] = String(isoDate || '').split('-');
  if (!year || !month || !day) return '-';
  return `${day}.${month}.${year.slice(2)}`;
}

function buildFinishedMessage(templateIndex) {
  const template =
    FINISHED_TASK_MESSAGES[
      ((templateIndex % FINISHED_TASK_MESSAGES.length) + FINISHED_TASK_MESSAGES.length) %
        FINISHED_TASK_MESSAGES.length
    ];

  return template;
}

function buildMonthListItems(monthEvents) {
  const absenceGroups = new Map();
  const items = [];

  for (const item of monthEvents) {
    const category = item.tag || item.category;
    if (category !== 'abwesenheit') {
      items.push(item);
      continue;
    }

    const key = `${item.title}::${item.note || ''}`;
    if (!absenceGroups.has(key)) {
      absenceGroups.set(key, {
        ...item,
        startDate: item.date,
        endDate: item.date,
      });
      continue;
    }

    const current = absenceGroups.get(key);
    if (item.date < current.startDate) current.startDate = item.date;
    if (item.date > current.endDate) current.endDate = item.date;
  }

  for (const absence of absenceGroups.values()) {
    items.push({
      ...absence,
      date:
        absence.startDate === absence.endDate
          ? absence.startDate
          : `${formatShortDate(absence.startDate)} - ${formatShortDate(absence.endDate)}`,
    });
  }

  return items.sort((a, b) => {
    const aDate = String(a.startDate || a.date);
    const bDate = String(b.startDate || b.date);
    if (aDate !== bDate) return aDate.localeCompare(bDate);
    return String(a.title).localeCompare(String(b.title));
  });
}

function DashboardOverview({ residents, activeResidentId, onOpenSkat }) {
  const [data, setData] = useState({
    assignments: [],
    calendarItems: [],
    weekStart: '',
  });
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  });
  const [confirmAssignment, setConfirmAssignment] = useState(null);
  const [isUpdatingAssignment, setIsUpdatingAssignment] = useState(false);
  const [showDoneAssignments, setShowDoneAssignments] = useState(false);
  const [shoppingItems, setShoppingItems] = useState([]);
  const [shoppingInput, setShoppingInput] = useState('');
  const [shoppingError, setShoppingError] = useState('');
  const [isShoppingLoading, setIsShoppingLoading] = useState(true);
  const [isShoppingSaving, setIsShoppingSaving] = useState(false);
  const [deletingShoppingItemId, setDeletingShoppingItemId] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [eventForm, setEventForm] = useState({
    category: 'termin',
    title: '',
    description: '',
    durationDays: 1,
  });
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [eventDeleteCandidate, setEventDeleteCandidate] = useState(null);
  const [eventError, setEventError] = useState('');
  const [skatAllTime, setSkatAllTime] = useState([]);
  const [finishedMessageIndex] = useState(() =>
    Math.floor(Math.random() * FINISHED_TASK_MESSAGES.length)
  );

  async function loadShoppingItems() {
    const response = await requestJson('/api/shopping-list');
    setShoppingItems(response.items || []);
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      const initialYear = String(monthCursor.getUTCFullYear());
      try {
        const [assignmentsRes, calendarRes, shoppingRes, skatRes] = await Promise.all([
          requestJson('/api/weekly-assignments'),
          requestJson(`/api/calendar?year=${initialYear}`),
          requestJson('/api/shopping-list'),
          requestJson('/api/skat/overview'),
        ]);

        if (!mounted) return;

        setData({
          assignments: assignmentsRes.items || [],
          calendarItems: calendarRes.items || [],
          weekStart: assignmentsRes.weekStart || '',
        });
        setShoppingItems(shoppingRes.items || []);
        setSkatAllTime(skatRes.allTime || []);
        setShoppingError('');
        setIsShoppingLoading(false);
      } catch (error) {
        if (mounted) {
          setData({
            assignments: [],
            calendarItems: [],
            weekStart: '',
          });
          setShoppingItems([]);
          setSkatAllTime([]);
          setShoppingError(error.message);
          setIsShoppingLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadCalendarForMonthYear() {
      const year = String(monthCursor.getUTCFullYear());
      try {
        const calendarRes = await requestJson(`/api/calendar?year=${year}`);
        if (!mounted) return;

        setData((current) => ({
          ...current,
          calendarItems: calendarRes.items || [],
        }));
      } catch (error) {
        if (mounted) {
          setData((current) => ({
            ...current,
            calendarItems: [],
          }));
        }
      }
    }

    loadCalendarForMonthYear();

    return () => {
      mounted = false;
    };
  }, [monthCursor]);

  const myAssignments = data.assignments.filter(
    (assignment) => assignment.residentId === activeResidentId
  );
  const openAssignments = myAssignments.filter((assignment) => assignment.status !== 'done');
  const doneAssignments = myAssignments.filter((assignment) => assignment.status === 'done');
  const openCount = openAssignments.length;
  const doneCount = doneAssignments.length;

  const monthYearLabel = monthCursor.toLocaleDateString('de-DE', {
    month: 'long',
    year: 'numeric',
  });

  const now = new Date();
  const isCurrentMonth =
    monthCursor.getUTCFullYear() === now.getUTCFullYear() &&
    monthCursor.getUTCMonth() === now.getUTCMonth();

  const monthPrefix = `${monthCursor.getUTCFullYear()}-${String(
    monthCursor.getUTCMonth() + 1
  ).padStart(2, '0')}`;

  const monthEvents = data.calendarItems.filter((item) =>
    String(item.date).startsWith(monthPrefix)
  );
  const monthListItems = buildMonthListItems(monthEvents);
  const selectedDayEvents = selectedDate
    ? data.calendarItems
        .filter((item) => item.date === selectedDate)
        .sort((a, b) => String(a.title).localeCompare(String(b.title)))
    : [];

  const eventsByDate = monthEvents.reduce((map, item) => {
    const key = item.date;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(item);
    return map;
  }, new Map());

  const firstWeekdayMondayBased = (() => {
    const weekday = monthCursor.getUTCDay();
    return weekday === 0 ? 6 : weekday - 1;
  })();

  const daysInMonth = new Date(
    Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth() + 1, 0)
  ).getUTCDate();

  const calendarCells = [];
  for (let i = 0; i < firstWeekdayMondayBased; i += 1) {
    calendarCells.push({ type: 'empty', key: `e-${i}` });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${monthPrefix}-${String(day).padStart(2, '0')}`;
    const dayItems = eventsByDate.get(iso) || [];
    const tags = Array.from(new Set(dayItems.map((item) => item.tag || item.category)));
    calendarCells.push({ type: 'day', key: iso, day, hasEvents: dayItems.length > 0, tags });
  }

  const activeResident = residents.find((resident) => resident.id === activeResidentId);
  const activeVisual = getResidentVisual(activeResident ? activeResident.name : '');
  const finishedMessage = buildFinishedMessage(finishedMessageIndex);

  function shiftMonth(delta) {
    setMonthCursor((current) =>
      new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + delta, 1))
    );
  }

  function jumpToCurrentMonth() {
    const today = new Date();
    setMonthCursor(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)));
  }

  async function confirmMarkDone() {
    if (!confirmAssignment || isUpdatingAssignment) return;

    setIsUpdatingAssignment(true);
    try {
      await requestJson(`/api/weekly-assignments/${confirmAssignment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'done' }),
      });

      setData((current) => ({
        ...current,
        assignments: current.assignments.map((assignment) =>
          assignment.id === confirmAssignment.id
            ? { ...assignment, status: 'done' }
            : assignment
        ),
      }));
      setShowDoneAssignments(true);
      setConfirmAssignment(null);
    } finally {
      setIsUpdatingAssignment(false);
    }
  }

  async function handleAddShoppingItem(event) {
    event.preventDefault();
    if (!shoppingInput.trim() || isShoppingSaving) return;

    setShoppingError('');
    setIsShoppingSaving(true);
    try {
      await requestJson('/api/shopping-list', {
        method: 'POST',
        body: JSON.stringify({ text: shoppingInput.trim() }),
      });
      setShoppingInput('');
      await loadShoppingItems();
    } catch (error) {
      setShoppingError(error.message);
    } finally {
      setIsShoppingSaving(false);
    }
  }

  async function handleDeleteShoppingItem(id) {
    if (deletingShoppingItemId) return;

    setShoppingError('');
    setDeletingShoppingItemId(id);
    try {
      await requestJson(`/api/shopping-list/${id}`, { method: 'DELETE' });
      await loadShoppingItems();
    } catch (error) {
      setShoppingError(error.message);
    } finally {
      setDeletingShoppingItemId(null);
    }
  }

  function openDayDetailsModal(dateIso) {
    setSelectedDate(dateIso);
    setIsEventFormOpen(false);
    setEventError('');
    setEventForm({
      category: 'termin',
      title: '',
      description: '',
      durationDays: 1,
    });
  }

  async function handleCreateEvent(event) {
    event.preventDefault();
    if (!selectedDate || isSavingEvent) return;

    setEventError('');
    setIsSavingEvent(true);
    try {
      await requestJson('/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify({
          date: selectedDate,
          category: eventForm.category,
          title: eventForm.title,
          description: eventForm.description,
          durationDays: Number(eventForm.durationDays) || 1,
        }),
      });

      const year = String(monthCursor.getUTCFullYear());
      const calendarRes = await requestJson(`/api/calendar?year=${year}`);
      setData((current) => ({
        ...current,
        calendarItems: calendarRes.items || [],
      }));
      setIsEventFormOpen(false);
      setEventForm({
        category: 'termin',
        title: '',
        description: '',
        durationDays: 1,
      });
    } catch (error) {
      setEventError(error.message);
    } finally {
      setIsSavingEvent(false);
    }
  }

  async function handleDeleteEventOccurrence(item) {
    if (!item || !item.sourceEventId || !item.canDeleteOccurrence) {
      return;
    }

    setEventDeleteCandidate(item);
  }

  async function confirmDeleteEventOccurrence() {
    if (!eventDeleteCandidate || isDeletingEvent) {
      return;
    }

    setEventError('');
    setIsDeletingEvent(true);
    try {
      await requestJson(
        `/api/calendar/events/${eventDeleteCandidate.sourceEventId}?date=${eventDeleteCandidate.date}`,
        {
        method: 'DELETE',
        }
      );

      const year = String(monthCursor.getUTCFullYear());
      const calendarRes = await requestJson(`/api/calendar?year=${year}`);
      setData((current) => ({
        ...current,
        calendarItems: calendarRes.items || [],
      }));
      setEventDeleteCandidate(null);
    } catch (error) {
      setEventError(error.message);
    } finally {
      setIsDeletingEvent(false);
    }
  }

  return (
    <section className="home-screen">
      <section className="home-section tasks-section">
        <div className="section-row">
          <h2>Deine Aufgaben</h2>
          <span className="section-meta">
            KW ab {formatWeekStartLabel(data.weekStart)}
          </span>
        </div>

        <div className="task-stats-row">
          <article className="task-stat-card">
            <div className="task-stat-inline">
              <strong>{openCount}</strong>
              <span>Offen</span>
            </div>
          </article>
          <button
            type="button"
            className={`task-stat-card task-stat-toggle ${showDoneAssignments ? 'active' : ''}`}
            onClick={() => setShowDoneAssignments((current) => !current)}
          >
            <div className="task-stat-inline">
              <strong>{doneCount}</strong>
              <span>Erledigt</span>
            </div>
            <span
              className={`task-stat-chevron ${showDoneAssignments ? 'open' : ''}`}
              aria-hidden="true"
            >
              ▾
            </span>
          </button>
        </div>

        <div className="week-task-list">
          {openAssignments.length === 0 ? (
            <div className="task-finished-card">
              <span className="task-finished-icon" aria-hidden="true">👍</span>
              <h3>Richtig gut gemacht!</h3>
              <p>Alles für diese Woche ist erledigt.</p>
              <p>{finishedMessage}</p>
            </div>
          ) : null}

          {openAssignments.map((assignment, index) => {
            const tones = ['tone-mint', 'tone-lavender', 'tone-cream', 'tone-sky'];
            return (
              <article
                key={assignment.id}
                className={`task-mini-card ${tones[index % tones.length]}`}
              >
                <div className="task-mini-head">
                  <h3>{assignment.taskName}</h3>
                  <span className="status-pill">
                    {assignment.status === 'done' ? 'done' : 'ongoing'}
                  </span>
                </div>
                <p>{assignment.details || 'Diese Woche normal erledigen.'}</p>
                <div className="task-mini-footer">
                  <span
                    className="resident-chip"
                    style={{ backgroundColor: activeVisual.color }}
                  >
                    {activeVisual.avatar} {activeResident ? activeResident.name : ''}
                  </span>
                  {assignment.status !== 'done' ? (
                    <button
                      type="button"
                      className="task-done-button"
                      onClick={() => setConfirmAssignment(assignment)}
                    >
                      Als fertig markieren
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}

          {showDoneAssignments && doneAssignments.length > 0 ? (
            <section className="done-task-panel">
              <div className="done-task-panel-head">
                <h3>Erledigte Aufgaben</h3>
                <span>{doneAssignments.length}</span>
              </div>
              <div className="done-task-list">
                {doneAssignments.map((assignment) => (
                  <article key={`done-${assignment.id}`} className="done-task-item">
                    <strong>{assignment.taskName}</strong>
                    <p>{assignment.details || 'Diese Aufgabe wurde erledigt.'}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </section>

      <section className="home-section shopping-section">
        <div className="section-row">
          <h2>Einkaufsliste</h2>
          <span className="section-meta">{shoppingItems.length} Einträge</span>
        </div>

        <form className="shopping-form" onSubmit={handleAddShoppingItem}>
          <input
            placeholder="Was muss gekauft werden?"
            value={shoppingInput}
            onChange={(event) => setShoppingInput(event.target.value)}
          />
          <button type="submit" disabled={isShoppingSaving}>
            {isShoppingSaving ? 'Speichert...' : 'Hinzufügen'}
          </button>
        </form>

        {shoppingError ? <p className="error-text">{shoppingError}</p> : null}

        <div className="shopping-list">
          {isShoppingLoading ? (
            <p className="task-status-empty">Lade Einkaufsliste...</p>
          ) : shoppingItems.length === 0 ? (
            <p className="task-status-empty">Noch nichts auf der Liste.</p>
          ) : (
            shoppingItems.map((item) => (
              <article key={item.id} className="shopping-item">
                <p>{item.text}</p>
                <button
                  type="button"
                  className="shopping-delete-button"
                  onClick={() => handleDeleteShoppingItem(item.id)}
                  disabled={deletingShoppingItemId === item.id}
                >
                  {deletingShoppingItemId === item.id ? 'Löscht...' : 'Entfernen'}
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="home-section calendar-section">
        <div className="calendar-head">
          <button type="button" className="circle-nav" onClick={() => shiftMonth(-1)}>
            {'<'}
          </button>
          <h2>{monthYearLabel}</h2>
          <button type="button" className="circle-nav" onClick={() => shiftMonth(1)}>
            {'>'}
          </button>
        </div>

        {!isCurrentMonth ? (
          <div className="calendar-today-row">
            <button type="button" className="today-month-button" onClick={jumpToCurrentMonth}>
              Zurück zum aktuellen Monat
            </button>
          </div>
        ) : null}

        <div className="calendar-weekdays">
          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="calendar-month-grid">
          {calendarCells.map((cell) => {
            if (cell.type === 'empty') {
              return <span key={cell.key} className="calendar-day empty" />;
            }
            return (
              <button
                key={cell.key}
                type="button"
                className={`calendar-day ${cell.hasEvents ? 'has-event' : ''}`}
                onClick={() => openDayDetailsModal(cell.key)}
              >
                <span className="calendar-day-number">{cell.day}</span>
                {cell.tags.length > 0 ? (
                  <span className="calendar-day-dots" aria-hidden="true">
                    {cell.tags.map((tag) => (
                      <span key={`${cell.key}-${tag}`} className={`calendar-day-dot tag-${tag}`} />
                    ))}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="waste-list">
          <h3>Ereignisse</h3>
          {monthListItems.length === 0 ? (
            <p>In diesem Monat keine Einträge.</p>
          ) : (
            <ul>
              {monthListItems.map((item) => (
                <li key={`${item.id}-${item.date}`}>
                  <span>
                    {String(item.date).includes('-') && String(item.date).includes('.')
                      ? item.date
                      : formatShortDate(item.date)}
                  </span>
                  <strong>{item.title}</strong>
                  <em className={`event-tag tag-${item.tag || item.category}`}>
                    {EVENT_LABELS[item.tag || item.category] || (item.tag || item.category)}
                  </em>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="home-section skat-preview-section">
        <div className="section-row">
          <h2>Skat-Podium</h2>
          <span className="section-meta">All-Time</span>
        </div>

        <div className="skat-podium-grid compact">
          {skatAllTime.slice(0, 4).map((item) => {
            const visual = getResidentVisual(item.residentName);
            return (
              <article key={item.residentId} className={`podium-item rank-${item.rank}`}>
                <div className="podium-medal" aria-hidden="true">
                  {item.medal === 'gold'
                    ? '🥇'
                    : item.medal === 'silver'
                      ? '🥈'
                      : item.medal === 'bronze'
                        ? '🥉'
                        : '🏅'}
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

        <button
          type="button"
          className="skat-link-button"
          onClick={() => {
            if (onOpenSkat) {
              onOpenSkat();
            }
          }}
        >
          Öffnen
        </button>
      </section>

      {confirmAssignment ? (
        <div
          className="confirm-modal-overlay"
          role="presentation"
          onClick={() => {
            if (!isUpdatingAssignment) {
              setConfirmAssignment(null);
            }
          }}
        >
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-done-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="confirm-done-title">Aufgabe als fertig markieren?</h3>
            <p>
              Hast du <strong>{confirmAssignment.taskName}</strong> wirklich gemacht?
            </p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="modal-button-secondary"
                onClick={() => setConfirmAssignment(null)}
                disabled={isUpdatingAssignment}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="modal-button-danger"
                onClick={confirmMarkDone}
                disabled={isUpdatingAssignment}
              >
                {isUpdatingAssignment ? 'Speichert...' : 'Ja, als fertig markieren'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedDate ? (
        <div className="confirm-modal-overlay" role="presentation" onClick={() => setSelectedDate('')}>
          <div className="confirm-modal event-form-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Tag im Kalender</h3>
            <p>Datum: {formatShortDate(selectedDate)}</p>

            <div className="day-details-list">
              <h4>Ereignisse an diesem Tag</h4>
              {selectedDayEvents.length === 0 ? (
                <p className="task-status-empty">Keine Ereignisse an diesem Tag.</p>
              ) : (
                <ul>
                  {selectedDayEvents.map((item) => (
                    <li key={`${item.id}-${item.date}`}>
                      <strong>{item.title}</strong>
                      <em className={`event-tag tag-${item.tag || item.category}`}>
                        {EVENT_LABELS[item.tag || item.category] || (item.tag || item.category)}
                      </em>
                      {item.note ? <span>{item.note}</span> : null}
                      {item.canDeleteOccurrence ? (
                        <button
                          type="button"
                          className="day-event-delete-button"
                          onClick={() => handleDeleteEventOccurrence(item)}
                        >
                          Dieses Ereignis löschen
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!isEventFormOpen ? (
              <button
                type="button"
                className="event-save-button"
                onClick={() => {
                  setIsEventFormOpen(true);
                  setEventError('');
                }}
              >
                Termin hinzufügen
              </button>
            ) : (
              <form onSubmit={handleCreateEvent} className="event-create-form">
                <h4>Neues Ereignis</h4>

                <label>
                  Tag/Kategorie
                  <select
                    value={eventForm.category}
                    onChange={(event) => setEventForm((current) => ({ ...current, category: event.target.value }))}
                  >
                    <option value="termin">Termin</option>
                    <option value="muell">Müll</option>
                    <option value="geburtstag">Geburtstag</option>
                  </select>
                </label>

                <label>
                  Name
                  <input
                    required
                    value={eventForm.title}
                    onChange={(event) => setEventForm((current) => ({ ...current, title: event.target.value }))}
                  />
                </label>

                <label>
                  Beschreibung
                  <textarea
                    rows="3"
                    value={eventForm.description}
                    onChange={(event) => setEventForm((current) => ({ ...current, description: event.target.value }))}
                  />
                </label>

                <label>
                  Dauer (Tage)
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={eventForm.durationDays}
                    onChange={(event) =>
                      setEventForm((current) => ({
                        ...current,
                        durationDays: event.target.value,
                      }))
                    }
                  />
                </label>

                {eventError ? <p className="error-text">{eventError}</p> : null}

                <div className="confirm-modal-actions">
                  <button
                    type="button"
                    className="modal-button-secondary"
                    onClick={() => setIsEventFormOpen(false)}
                    disabled={isSavingEvent}
                  >
                    Zurück
                  </button>
                  <button type="submit" className="event-save-button" disabled={isSavingEvent}>
                    {isSavingEvent ? 'Speichert...' : 'Termin speichern'}
                  </button>
                </div>
              </form>
            )}

            {!isEventFormOpen ? (
              <div className="confirm-modal-actions">
                <button type="button" className="modal-button-secondary" onClick={() => setSelectedDate('')}>
                  Schliessen
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {eventDeleteCandidate ? (
        <div
          className="confirm-modal-overlay"
          role="presentation"
          onClick={() => {
            if (!isDeletingEvent) {
              setEventDeleteCandidate(null);
            }
          }}
        >
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-day-event-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="confirm-delete-day-event-title">Ereignis löschen?</h3>
            <p>
              Soll <strong>{eventDeleteCandidate.title}</strong> nur für{' '}
              <strong>{formatShortDate(eventDeleteCandidate.date)}</strong> gelöscht werden?
            </p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="modal-button-secondary"
                onClick={() => setEventDeleteCandidate(null)}
                disabled={isDeletingEvent}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="modal-button-danger"
                onClick={confirmDeleteEventOccurrence}
                disabled={isDeletingEvent}
              >
                {isDeletingEvent ? 'Löscht...' : 'Ja, löschen'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default DashboardOverview;




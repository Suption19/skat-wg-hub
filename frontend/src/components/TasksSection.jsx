import { useEffect, useState } from 'react';

import { requestJson } from '../api';

const initialForm = {
  name: '',
  description: '',
  cycle: 'weekly',
  oneTimeDate: '',
  dayOfMonth: '',
  residentIds: [],
};

function TasksSection() {
  const [taskTypes, setTaskTypes] = useState([]);
  const [residents, setResidents] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [error, setError] = useState('');

  async function loadData() {
    const [taskTypesRes, residentsRes] = await Promise.all([
      requestJson('/api/task-types'),
      requestJson('/api/residents'),
    ]);

    setTaskTypes(taskTypesRes.items || []);
    setResidents(residentsRes.items || []);
  }

  useEffect(() => {
    loadData().catch((err) => setError(err.message));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    try {
      await requestJson('/api/task-types', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          description: form.description ? form.description.trim() : '',
          dayOfMonth:
            form.cycle === 'monthly' && form.dayOfMonth
              ? Number(form.dayOfMonth)
              : null,
          oneTimeDate: form.cycle === 'once' ? form.oneTimeDate : null,
        }),
      });
      setForm(initialForm);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function confirmDeleteTaskType() {
    if (!deleteCandidate) return;

    setError('');
    try {
      await requestJson(`/api/task-types/${deleteCandidate.id}`, { method: 'DELETE' });
      setDeleteCandidate(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleResidentSelection(residentId) {
    setForm((current) => {
      const exists = current.residentIds.includes(residentId);
      return {
        ...current,
        residentIds: exists
          ? current.residentIds.filter((id) => id !== residentId)
          : [...current.residentIds, residentId],
      };
    });
  }

  return (
    <section className="card data-section tasks-page">
      <div className="section-headline">
        <h2>Aufgabenplan</h2>
        <p>
          Aufgabentypen mit Zyklus, optionaler Beschreibung und Bewohner-Scope.
        </p>
      </div>

      <form className="inline-form grid-2" onSubmit={handleSubmit}>
        <input
          required
          placeholder="Aufgabentyp (z. B. Müll rausbringen)"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
        <input
          placeholder="Beschreibung (optional)"
          value={form.description}
          onChange={(event) =>
            setForm({ ...form, description: event.target.value })
          }
        />
        <select
          value={form.cycle}
          onChange={(event) => setForm({ ...form, cycle: event.target.value })}
        >
          <option value="weekly">Wöchentlich</option>
          <option value="monthly">Monatlich</option>
          <option value="once">Einmalig</option>
        </select>

        {form.cycle === 'once' ? (
          <input
            required
            type="date"
            value={form.oneTimeDate}
            onChange={(event) =>
              setForm({ ...form, oneTimeDate: event.target.value })
            }
          />
        ) : null}

        {form.cycle === 'monthly' ? (
          <input
            required
            type="number"
            min="1"
            max="31"
            placeholder="Tag im Monat (1-31)"
            value={form.dayOfMonth}
            onChange={(event) =>
              setForm({ ...form, dayOfMonth: event.target.value })
            }
          />
        ) : null}

        <div className="scope-box">
          <p>Berücksichtigte Bewohner</p>
          <div className="scope-list">
            {residents.map((resident) => (
              <label key={resident.id}>
                <input
                  type="checkbox"
                  checked={form.residentIds.includes(resident.id)}
                  onChange={() => toggleResidentSelection(resident.id)}
                />
                <span>{resident.name}</span>
              </label>
            ))}
          </div>
          <small>Wenn nichts ausgewählt ist, gelten automatisch alle Bewohner.</small>
        </div>

        <button type="submit">Aufgabentyp speichern</button>
      </form>

      {error && <p className="error-text">{error}</p>}

      <section className="sub-block">
        <div className="sub-block-head">
          <h3>Aufgabentypen</h3>
        </div>
        <div className="table-wrap">
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Beschreibung</th>
                <th>Zyklus</th>
                <th>Scope</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {taskTypes.map((taskType) => (
                <tr key={taskType.id}>
                  <td data-label="Name">{taskType.name}</td>
                  <td data-label="Beschreibung">{taskType.description || '-'}</td>
                  <td data-label="Zyklus">
                    {taskType.cycle}
                    {taskType.cycle === 'monthly' && taskType.dayOfMonth
                      ? ` (Tag ${taskType.dayOfMonth})`
                      : ''}
                    {taskType.cycle === 'once' && taskType.oneTimeDate
                      ? ` (${taskType.oneTimeDate})`
                      : ''}
                  </td>
                  <td data-label="Scope">
                    {taskType.residentNames && taskType.residentNames.length > 0
                      ? taskType.residentNames.join(', ')
                      : 'Alle Bewohner'}
                  </td>
                  <td data-label="Aktion" className="mobile-action-cell">
                    <button
                      type="button"
                      className="ghost-danger"
                      onClick={() => setDeleteCandidate(taskType)}
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {deleteCandidate ? (
        <div
          className="confirm-modal-overlay"
          role="presentation"
          onClick={() => setDeleteCandidate(null)}
        >
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-tasktype-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="delete-tasktype-title">Aufgabentyp löschen?</h3>
            <p>
              Willst du <strong>{deleteCandidate.name}</strong> wirklich löschen?
            </p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="modal-button-secondary"
                onClick={() => setDeleteCandidate(null)}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="modal-button-danger"
                onClick={confirmDeleteTaskType}
              >
                Ja, löschen
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default TasksSection;



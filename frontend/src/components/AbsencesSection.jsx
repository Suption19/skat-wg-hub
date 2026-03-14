import { useEffect, useState } from 'react';

import { requestJson } from '../api';

const initialForm = {
  residentId: '',
  residentName: '',
  startDate: '',
  endDate: '',
  note: '',
};

function AbsencesSection() {
  const [items, setItems] = useState([]);
  const [residents, setResidents] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');

  async function loadData() {
    const [absencesRes, residentsRes] = await Promise.all([
      requestJson('/api/absences'),
      requestJson('/api/residents'),
    ]);

    setItems(absencesRes.items || []);
    setResidents(residentsRes.items || []);
  }

  useEffect(() => {
    loadData().catch((err) => setError(err.message));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    try {
      const selected = residents.find(
        (resident) => String(resident.id) === String(form.residentId)
      );

      await requestJson('/api/absences', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          residentId: form.residentId || null,
          residentName: selected ? selected.name : form.residentName,
        }),
      });
      setForm(initialForm);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    setError('');
    try {
      await requestJson(`/api/absences/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="card data-section">
      <div className="section-headline">
        <h2>Abwesenheiten</h2>
        <p>Grundlage für spätere automatische Umverteilung von Aufgaben.</p>
      </div>

      <form className="inline-form grid-2" onSubmit={handleSubmit}>
        <select
          value={form.residentId}
          onChange={(event) => setForm({ ...form, residentId: event.target.value })}
        >
          <option value="">Manueller Name</option>
          {residents.map((resident) => (
            <option key={resident.id} value={resident.id}>
              {resident.name}
            </option>
          ))}
        </select>
        <input
          placeholder="Name (optional)"
          value={form.residentName}
          onChange={(event) =>
            setForm({ ...form, residentName: event.target.value })
          }
        />
        <input
          required
          type="date"
          value={form.startDate}
          onChange={(event) =>
            setForm({ ...form, startDate: event.target.value })
          }
        />
        <input
          required
          type="date"
          value={form.endDate}
          onChange={(event) => setForm({ ...form, endDate: event.target.value })}
        />
        <input
          placeholder="Notiz"
          value={form.note}
          onChange={(event) => setForm({ ...form, note: event.target.value })}
        />
        <button type="submit">Abwesenheit speichern</button>
      </form>

      {error && <p className="error-text">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Bewohner</th>
              <th>Start</th>
              <th>Ende</th>
              <th>Notiz</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((absence) => (
              <tr key={absence.id}>
                <td>{absence.residentName || '-'}</td>
                <td>{absence.startDate}</td>
                <td>{absence.endDate}</td>
                <td>{absence.note || '-'}</td>
                <td>
                  <button
                    type="button"
                    className="ghost-danger"
                    onClick={() => handleDelete(absence.id)}
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
  );
}

export default AbsencesSection;



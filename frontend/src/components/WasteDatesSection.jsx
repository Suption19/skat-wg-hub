import { useEffect, useState } from 'react';

import { requestJson } from '../api';

const initialForm = { type: 'Restmüll', date: '', note: '' };

function WasteDatesSection() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');

  async function loadWasteDates() {
    const response = await requestJson('/api/waste-dates');
    setItems(response.items || []);
  }

  useEffect(() => {
    loadWasteDates().catch((err) => setError(err.message));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    try {
      await requestJson('/api/waste-dates', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setForm(initialForm);
      await loadWasteDates();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    setError('');
    try {
      await requestJson(`/api/waste-dates/${id}`, { method: 'DELETE' });
      await loadWasteDates();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="card data-section">
      <div className="section-headline">
        <h2>Muelltermine</h2>
        <p>Plan für Restmüll, Papier und Bio inkl. Notizen.</p>
      </div>

      <form className="inline-form grid-2" onSubmit={handleSubmit}>
        <select
          value={form.type}
          onChange={(event) => setForm({ ...form, type: event.target.value })}
        >
          <option value="Restmüll">Restmüll</option>
          <option value="Papier">Papier</option>
          <option value="Bio">Bio</option>
          <option value="Gelber Sack">Gelber Sack</option>
        </select>
        <input
          required
          type="date"
          value={form.date}
          onChange={(event) => setForm({ ...form, date: event.target.value })}
        />
        <input
          placeholder="Notiz"
          value={form.note}
          onChange={(event) => setForm({ ...form, note: event.target.value })}
        />
        <button type="submit">Termin speichern</button>
      </form>

      {error && <p className="error-text">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Typ</th>
              <th>Datum</th>
              <th>Notiz</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((wasteDate) => (
              <tr key={wasteDate.id}>
                <td>{wasteDate.type}</td>
                <td>{wasteDate.date}</td>
                <td>{wasteDate.note || '-'}</td>
                <td>
                  <button
                    type="button"
                    className="ghost-danger"
                    onClick={() => handleDelete(wasteDate.id)}
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

export default WasteDatesSection;



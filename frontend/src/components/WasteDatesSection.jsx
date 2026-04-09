import { useEffect, useState } from 'react';

import { requestJson } from '../api';

const initialForm = { type: 'Restmüll', date: '', note: '' };

function WasteDatesSection() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');

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
    setUploadMessage('');

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

  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    setError('');
    setUploadMessage('');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const res = await requestJson('/api/waste-dates/import', {
          method: 'POST',
          body: JSON.stringify({ icsData: text }),
        });
        setUploadMessage(res.message);
        await loadWasteDates();
      } catch (err) {
        setError(err.message);
      }
    };
    reader.readAsText(file);
    // Reset file input
    event.target.value = null;
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
        <h2>Abfuhrkalender</h2>
        <p>Plan für Restmüll, Papier und Bio inkl. Notizen.</p>
      </div>

      <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h3>ICS Import</h3>
        <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Lade eine .ics Datei des Abfuhrkalenders hoch (z.B. vom Abfallwirtschaftsbetrieb):</p>
        <input type="file" accept=".ics" onChange={handleFileUpload} />
        {uploadMessage && <p style={{ color: 'green', marginTop: '0.5rem' }}>{uploadMessage}</p>}
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



import { useEffect, useState } from 'react';

import { requestJson } from '../api';

function ResidentsSection({ isAdmin }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', color: '#7aa6ff' });

  async function loadResidents() {
    const response = await requestJson('/api/residents');
    setItems(response.items || []);
  }

  useEffect(() => {
    loadResidents().catch((err) => setError(err.message));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);
    try {
      await requestJson('/api/residents', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setForm({ name: '', email: '', color: '#7aa6ff' });
      await loadResidents();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="card data-section">
      <div className="section-headline">
        <h2>Bewohner</h2>
        <p>Übersicht der WG-Bewohner und Benutzer.</p>
      </div>

      {error && <p className="error-text">{error}</p>}

      {isAdmin && (
        <form onSubmit={handleSubmit} className="admin-form" style={{ marginBottom: '2rem' }}>
          <h3>Neuen Bewohner hinzufügen</h3>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr 1fr auto', alignItems: 'end' }}>
            <label>
              Name
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              E-Mail (optional)
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              Farbe
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                style={{ width: '100%', height: '2.5rem', padding: '0', cursor: 'pointer' }}
              />
            </label>
            <button type="submit" disabled={isSubmitting} className="primary-button" style={{ height: '2.5rem' }}>
              {isSubmitting ? 'Wird hinzugefügt...' : 'Hinzufügen'}
            </button>
          </div>
          <p className="help-text">
            Das Standardpasswort für neu angelegte Accounts lautet "1234".
          </p>
        </form>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>E-Mail</th>
              <th>Farbe</th>
            </tr>
          </thead>
          <tbody>
            {items.map((resident) => (
              <tr key={resident.id}>
                <td>{resident.name}</td>
                <td>{resident.email || '-'}</td>
                <td>
                  <span className="color-pill">
                    <span
                      className="color-dot"
                      style={{ backgroundColor: resident.color || '#7aa6ff' }}
                    />
                    {resident.color || '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default ResidentsSection;


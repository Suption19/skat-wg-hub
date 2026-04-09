import { useEffect, useState, useMemo } from 'react';
import { requestJson } from '../api';

function ExpensesSection({ residents }) {
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [form, setForm] = useState({
    resident_id: '',
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    async function loadExpenses() {
      try {
        const data = await requestJson('/api/expenses');
        setExpenses(data || []);
      } catch (err) {
        setError(err.message);
      }
    }
    loadExpenses();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const response = await requestJson('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setExpenses([response, ...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)));
      setForm(prev => ({ ...prev, amount: '', description: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  const { totals, most, least } = useMemo(() => {
    const sums = {};
    residents.forEach(r => sums[r.id] = 0);
    expenses.forEach(e => {
      if (sums[e.resident_id] !== undefined) {
        sums[e.resident_id] += e.amount;
      }
    });

    let max = -1;
    let min = Infinity;
    let mostIds = [];
    let leastIds = [];

    // Find min and max
    Object.entries(sums).forEach(([rid, total]) => {
      if (total > max) max = total;
      if (total < min) min = total;
    });

    // Handle case where everyone has 0 or same amount
    if (min === max) {
        if (min === 0 || min === Infinity) return { totals: sums, most: [], least: [] };
    }

    Object.entries(sums).forEach(([rid, total]) => {
      const id = parseInt(rid, 10);
      if (total === max) mostIds.push(id);
      if (total === min) leastIds.push(id);
    });

    return { totals: sums, most: mostIds, least: leastIds };
  }, [expenses, residents]);

  return (
    <section className="card data-section">
      <div className="section-headline">
        <h2>Ausgaben</h2>
        <p>WG-Ausgaben und wer am meisten bezahlt hat.</p>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="admin-form" style={{ marginBottom: '2rem' }}>
        <h3>Neue Ausgabe erfassen</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) 100px 100px 2fr auto', gap: '1rem', alignItems: 'end' }}>
            <label>
              Bewohner
              <select
                required
                value={form.resident_id}
                onChange={e => setForm({ ...form, resident_id: e.target.value })}
              >
                <option value="">Auswählen...</option>
                {residents.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </label>
            <label>
              Betrag (€)
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
              />
            </label>
            <label>
              Datum
              <input
                required
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
              />
            </label>
            <label>
              Beschreibung
              <input
                required
                type="text"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="z.B. Supermarkt"
              />
            </label>
            <button type="submit" disabled={isSaving}>
              {isSaving ? 'Speichert...' : 'Hinzufügen'}
            </button>
          </div>
        </form>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3>Statistik (Gesamtausgaben)</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {residents.map(r => {
            const total = totals[r.id] || 0;
            const isMost = most.includes(r.id);
            const isLeast = least.includes(r.id);
            
            let badgeStyle = { 
              padding: '0.8rem 1.2rem', 
              borderRadius: '8px', 
              fontWeight: '500',
              backgroundColor: 'var(--surface-color-2)' 
            };
            
            if (isMost) {
              badgeStyle.backgroundColor = '#d4edda';
              badgeStyle.color = '#155724';
              badgeStyle.border = '1px solid #c3e6cb';
            } else if (isLeast) {
              badgeStyle.backgroundColor = '#f8d7da';
              badgeStyle.color = '#721c24';
              badgeStyle.border = '1px solid #f5c6cb';
            }

            return (
              <div key={r.id} style={badgeStyle}>
                <div>{r.name}</div>
                <div style={{ fontSize: '1.2rem', marginTop: '0.2rem' }}>{total.toFixed(2)} €</div>
              </div>
            )
          })}
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Grün = hat am meisten bezahlt, Rot = hat am wenigsten bezahlt.
        </p>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Bewohner</th>
              <th>Beschreibung</th>
              <th>Betrag (€)</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(exp => {
              const res = residents.find(r => r.id === exp.resident_id);
              return (
                <tr key={exp.id}>
                  <td>{new Date(exp.date).toLocaleDateString('de-DE')}</td>
                  <td>{res ? res.name : `ID: ${exp.resident_id}`}</td>
                  <td>{exp.description}</td>
                  <td>{exp.amount.toFixed(2)} €</td>
                </tr>
              );
            })}
            {expenses.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '1rem' }}>Keine Ausgaben vorhanden.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default ExpensesSection;
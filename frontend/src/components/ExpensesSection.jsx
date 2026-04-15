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
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>💰 Ausgaben</h2>
        <p>WG-Ausgaben und wer am meisten bezahlt hat.</p>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="admin-form" style={{ marginBottom: '2rem', backgroundColor: 'var(--surface-color-2)', padding: '1.5rem', borderRadius: '12px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Neue Ausgabe erfassen</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', containerType: 'inline-size' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: '1 1 150px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Bewohner</span>
              <select
                required
                value={form.resident_id}
                onChange={e => setForm({ ...form, resident_id: e.target.value })}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
              >
                <option value="">Auswählen...</option>
                {residents.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: '1 1 100px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Betrag (€)</span>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: '1 1 140px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Datum</span>
              <input
                required
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: '2 1 200px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Beschreibung</span>
              <input
                required
                type="text"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="z.B. Supermarkt"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
              />
            </label>
            <button type="submit" disabled={isSaving} style={{ padding: '0.6rem 1.5rem', flex: '1 1 120px', fontWeight: 600, minHeight: '40px' }}>
              {isSaving ? 'Speichert...' : 'Hinzufügen'}
            </button>
          </div>
        </form>
      </div>

      <div style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Statistik (Gesamtausgaben)</h3>
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          {residents.map(r => {
            const total = totals[r.id] || 0;
            const isMost = most.includes(r.id);
            const isLeast = least.includes(r.id);
            
            let badgeStyle = { 
              padding: '0.6rem 1.2rem', 
              borderRadius: '999px', // Pill shape
              fontWeight: '600',
              backgroundColor: 'var(--surface-color)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            };
            
            if (isMost) {
              badgeStyle.backgroundColor = '#ecfdf5'; // min-green-50
              badgeStyle.color = '#047857'; // text-green-700
              badgeStyle.border = '1px solid #10b981'; // border-green-500
            } else if (isLeast) {
              badgeStyle.backgroundColor = '#fef2f2'; // bg-red-50
              badgeStyle.color = '#b91c1c'; // text-red-700
              badgeStyle.border = '1px solid #ef4444'; // border-red-500
            }

            return (
              <div key={r.id} style={badgeStyle}>
                <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>{r.name}</span>
                <span style={{ fontSize: '1rem' }}>{total.toFixed(2)} €</span>
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
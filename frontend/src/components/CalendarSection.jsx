import { useEffect, useMemo, useState } from 'react';

import { requestJson } from '../api';

const monthNames = [
  'Januar',
  'Februar',
  'Maerz',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

function formatDate(isoDate) {
  const [year, month, day] = String(isoDate).split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}.${month}.${year}`;
}

function CalendarSection() {
  const [items, setItems] = useState([]);
  const [year] = useState('2026');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadCalendar() {
      try {
        const result = await requestJson(`/api/calendar?year=${year}`);
        setItems(result.items || []);
      } catch (err) {
        setError(err.message);
      }
    }

    loadCalendar();
  }, [year]);

  const groups = useMemo(() => {
    const grouped = new Map();

    for (const item of items) {
      const month = Number(String(item.date).slice(5, 7));
      if (!grouped.has(month)) {
        grouped.set(month, []);
      }
      grouped.get(month).push(item);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([month, monthItems]) => ({
        month,
        label: monthNames[month - 1] || `Monat ${month}`,
        items: monthItems,
      }));
  }, [items]);

  return (
    <section className="card data-section">
      <div className="section-headline">
        <h2>Kalender</h2>
        <p>
          Start der Kalenderuebersicht. Aktuell sind hier die Muelltermine für 2026 hinterlegt.
        </p>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="calendar-grid">
        {groups.map((group) => (
          <article key={group.month} className="calendar-month card">
            <h3>{group.label}</h3>
            <ul>
              {group.items.map((item) => (
                <li key={`${item.category}-${item.id}`}>
                  <span>{formatDate(item.date)}</span>
                  <strong>{item.title}</strong>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export default CalendarSection;



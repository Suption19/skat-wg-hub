import { useEffect, useState } from 'react';

import { requestJson } from '../api';

function ResidentsSection() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  async function loadResidents() {
    const response = await requestJson('/api/residents');
    setItems(response.items || []);
  }

  useEffect(() => {
    loadResidents().catch((err) => setError(err.message));
  }, []);

  return (
    <section className="card data-section">
      <div className="section-headline">
        <h2>Bewohner</h2>
        <p>
          Fester aktueller Stand: Tomasz, Finn, Nele und Leila.
          Diese vier werden in der Rotation verwendet.
        </p>
      </div>

      {error && <p className="error-text">{error}</p>}

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


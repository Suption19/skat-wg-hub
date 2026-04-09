import { useEffect, useState } from 'react';
import { requestJson } from '../api';

function SettingsSection() {
  const [hiddenTabs, setHiddenTabs] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const toggleOptions = [
    { id: 'tasks', label: 'Aufgabenplan' },
    { id: 'taskStatus', label: 'Aufgabenstatus' },
    { id: 'skat', label: 'Skat' },
    { id: 'absences', label: 'Abwesenheiten' },
    { id: 'expenses', label: 'Ausgaben' },
  ];

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await requestJson('/api/settings/hidden_tabs');
        if (response.hidden_tabs && Array.isArray(response.hidden_tabs)) {
          setHiddenTabs(response.hidden_tabs);
        } else if (response.hiddenTabs && Array.isArray(response.hiddenTabs)) {
          setHiddenTabs(response.hiddenTabs);
        }
      } catch (err) {
        setError('Fehler beim Laden der Einstellungen: ' + err.message);
      }
    }
    loadSettings();
  }, []);

  async function handleToggle(tabId) {
    let updated;
    if (hiddenTabs.includes(tabId)) {
      updated = hiddenTabs.filter(id => id !== tabId);
    } else {
      updated = [...hiddenTabs, tabId];
    }
    
    setHiddenTabs(updated);
    setIsSaving(true);
    
    try {
      await requestJson('/api/settings', {
        method: 'POST',
        body: JSON.stringify({ key: 'hidden_tabs', value: updated }),
      });
      setError(null);
    } catch (err) {
      setError('Fehler beim Speichern: ' + err.message);
      // Revert optimism if failed
      setHiddenTabs(hiddenTabs);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="card data-section">
      <div className="section-headline">
        <h2>Globale Einstellungen</h2>
        <p>Verstecke bestimmte Tabs für nicht-admin WG-Bewohner.</p>
      </div>

      {error && <p className="error-text">{error}</p>}
      
      <div className="admin-form">
        <h3>Sichtbarkeit der Module</h3>
        <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Aktiviere die Häkchen bei Tabs, die für reguläre WG-Bewohner <strong>ausgeblendet</strong> werden sollen.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {toggleOptions.map(option => (
            <label key={option.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hiddenTabs.includes(option.id)}
                onChange={() => handleToggle(option.id)}
                disabled={isSaving}
              />
              {option.label} (verstecken)
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}

export default SettingsSection;
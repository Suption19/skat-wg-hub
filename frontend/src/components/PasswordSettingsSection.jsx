import { useState } from 'react';

import { requestJson } from '../api';

function PasswordSettingsSection({ onPasswordChanged }) {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', repeatPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) return;

    setError('');
    setSuccess('');

    if (form.newPassword !== form.repeatPassword) {
      setError('Die neuen Passwörter stimmen nicht überein.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await requestJson('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          oldPassword: form.oldPassword,
          newPassword: form.newPassword,
        }),
      });

      setForm({ oldPassword: '', newPassword: '', repeatPassword: '' });
      setSuccess('Passwort erfolgreich geändert.');
      if (onPasswordChanged) {
        onPasswordChanged(response.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="card data-section">
      <div className="section-headline">
        <h2>Passwort ändern</h2>
        <p>Hier kannst du dein Login-Passwort aktualisieren.</p>
      </div>

      <p className="password-settings-hint">
        Gib zuerst dein aktuelles Passwort ein und danach zweimal dein neues Passwort.
      </p>

      <form className="inline-form password-form" onSubmit={handleSubmit}>
        <label>
          Aktuelles Passwort
          <input
            required
            type="password"
            value={form.oldPassword}
            onChange={(event) =>
              setForm((current) => ({ ...current, oldPassword: event.target.value }))
            }
            autoComplete="current-password"
          />
        </label>
        <label>
          Neues Passwort
          <input
            required
            type="password"
            minLength={4}
            value={form.newPassword}
            onChange={(event) =>
              setForm((current) => ({ ...current, newPassword: event.target.value }))
            }
            autoComplete="new-password"
          />
        </label>
        <label>
          Neues Passwort wiederholen
          <input
            required
            type="password"
            minLength={4}
            value={form.repeatPassword}
            onChange={(event) =>
              setForm((current) => ({ ...current, repeatPassword: event.target.value }))
            }
            autoComplete="new-password"
          />
        </label>
        <button type="submit" className="auth-primary-button" disabled={isSaving}>
          {isSaving ? 'Speichert...' : 'Passwort speichern'}
        </button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}
    </section>
  );
}

export default PasswordSettingsSection;


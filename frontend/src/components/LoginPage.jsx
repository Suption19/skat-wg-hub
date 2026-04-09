import { useState } from 'react';

function LoginPage({ onLogin, onRegister }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);
    try {
      if (isRegisterMode) {
        await onRegister(form);
      } else {
        await onLogin(form);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-card">
        <h1>WG Hub {isRegisterMode ? 'Registrierung' : 'Login'}</h1>
        <p>
          {isRegisterMode
            ? 'Registriere hier deinen eigenen Bewohner-Account.'
            : 'Melde dich an, um die App zu nutzen.'}
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Benutzername
            <input
              required
              value={form.username}
              onChange={(event) =>
                setForm((current) => ({ ...current, username: event.target.value }))
              }
              autoComplete="username"
            />
          </label>

          <label>
            Passwort
            <input
              required
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              autoComplete={isRegisterMode ? "new-password" : "current-password"}
            />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button type="submit" className="auth-primary-button" disabled={isSubmitting}>
            {isSubmitting
              ? (isRegisterMode ? 'Registrieren...' : 'Einloggen...')
              : (isRegisterMode ? 'Registrieren' : 'Einloggen')}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setIsRegisterMode(!isRegisterMode)}
          style={{ marginTop: '1rem', background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {isRegisterMode ? 'Zurück zum Login' : 'Noch kein Account? Hier registrieren'}
        </button>
      </section>
    </div>
  );
}

export default LoginPage;


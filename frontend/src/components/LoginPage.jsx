import { useState } from 'react';

function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);
    try {
      await onLogin(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-card">
        <h1>WG Hub Login</h1>
        <p>Melde dich an, um die App zu nutzen.</p>

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
              autoComplete="current-password"
            />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button type="submit" className="auth-primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Einloggen...' : 'Einloggen'}
          </button>
        </form>
      </section>
    </div>
  );
}

export default LoginPage;


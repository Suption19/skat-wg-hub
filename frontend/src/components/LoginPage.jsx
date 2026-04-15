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
    <div className="login-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f3f4f6', fontFamily: 'system-ui, sans-serif' }}>
      <section className="login-card" style={{ 
        background: 'rgba(255, 255, 255, 0.7)', 
        backdropFilter: 'blur(16px)', 
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '24px', 
        padding: '3rem', 
        width: '100%', 
        maxWidth: '480px', 
        boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
        border: '1px solid rgba(255,255,255,0.4)',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-0.03em', margin: '0 0 0.5rem 0', color: '#111827' }}>
          WG Hub {isRegisterMode ? 'Registrierung' : 'Login'}
        </h1>
        <p style={{ color: '#4b5563', fontSize: '1.125rem', marginBottom: '2.5rem' }}>
          {isRegisterMode
            ? 'Hier legst du deinen neuen WG-Account an.'
            : 'Willkommen zurück. Bitte melde dich an.'}
        </p>

        <form onSubmit={handleSubmit} className="login-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontWeight: '500', color: '#374151' }}>
            Benutzername
            <input
              required
              value={form.username}
              onChange={(event) =>
                setForm((current) => ({ ...current, username: event.target.value }))
              }
              autoComplete="username"
              style={{ padding: '0.875rem 1rem', borderRadius: '12px', border: '1px solid #d1d5db', backgroundColor: 'rgba(255,255,255,0.9)', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontWeight: '500', color: '#374151' }}>
            Passwort
            <input
              required
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              autoComplete={isRegisterMode ? "new-password" : "current-password"}
              style={{ padding: '0.875rem 1rem', borderRadius: '12px', border: '1px solid #d1d5db', backgroundColor: 'rgba(255,255,255,0.9)', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </label>

          {error ? <p className="error-text" style={{ color: '#ef4444', backgroundColor: '#fee2e2', padding: '0.75rem', borderRadius: '8px', margin: '0' }}>{error}</p> : null}

          <button type="submit" className="auth-primary-button" disabled={isSubmitting} style={{ 
            marginTop: '0.5rem',
            padding: '1rem', 
            borderRadius: '12px', 
            border: 'none', 
            backgroundColor: '#111827', 
            color: '#ffffff', 
            fontSize: '1.125rem', 
            fontWeight: '600', 
            cursor: isSubmitting ? 'not-allowed' : 'pointer', 
            transition: 'transform 0.1s, background-color 0.2s',
            opacity: isSubmitting ? 0.7 : 1
          }}>
            {isSubmitting
              ? (isRegisterMode ? 'Registrieren...' : 'Einloggen...')
              : (isRegisterMode ? 'Registrieren' : 'Einloggen')}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setIsRegisterMode(!isRegisterMode)}
          style={{ marginTop: '2rem', background: 'none', border: 'none', color: '#3b82f6', fontWeight: '500', cursor: 'pointer', transition: 'color 0.2s' }}
          onMouseOver={(e) => e.target.style.color = '#2563eb'}
          onMouseOut={(e) => e.target.style.color = '#3b82f6'}
        >
          {isRegisterMode ? 'Bereits einen Account? Hier einloggen' : 'Neu hier? Account anlegen'}
        </button>
      </section>
    </div>
  );
}

export default LoginPage;


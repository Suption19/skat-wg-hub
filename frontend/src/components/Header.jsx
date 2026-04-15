import { useState } from 'react';
import { getResidentVisual } from '../residentVisuals';

const HEADER_SLOGANS = [
  'Abwasch heute, Legenden morgen.',
  'WG-Level: Chaos mit System.',
  'Kühlschrank voll, Motivation halb voll.',
  'Einer kocht, alle essen, keiner war es.',
  'Teamwork macht den Müll weg.',
  'Putzplan aktiv, Ausreden in Wartung.',
  'Hier wird fair verteilt und laut gelacht.',
  'Kaffee zuerst, Aufgaben danach.',
  'Heute schon die Küche besiegt?',
  'Vier Leute, ein Haushalt, viele Stories.',
];

function Header({
  navItems,
  activeView,
  onChangeView,
  currentUser,
  onOpenSettings,
  onLogout,
}) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [headerSlogan] = useState(
    () => HEADER_SLOGANS[Math.floor(Math.random() * HEADER_SLOGANS.length)]
  );

  const visual = getResidentVisual(currentUser ? currentUser.residentName : '');

  function handleSelect(viewId) {
    onChangeView(viewId);
    setIsNavOpen(false);
  }

  return (
    <header className="topbar">
      <div className="profile-identity" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          type="button"
          className="resident-avatar-button"
          aria-label="Zur Startseite"
          onClick={() => {
            onChangeView('dashboard');
            setIsNavOpen(false);
            setIsProfileOpen(false);
          }}
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
        >
          <span
            className="resident-avatar-large"
            style={{ 
              backgroundColor: visual.color, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: '48px', 
              height: '48px', 
              borderRadius: '50%',
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
            aria-hidden="true"
          >
            {visual.avatar}
          </span>
        </button>
        <div className="profile-menu profile-menu-inline" style={{ position: 'relative' }}>
          <button
            type="button"
            className="identity-trigger"
            aria-expanded={isProfileOpen}
            aria-label="Profil wechseln"
            onClick={() => {
              setIsProfileOpen((current) => !current);
              setIsNavOpen(false);
            }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              background: isProfileOpen ? 'rgba(0,0,0,0.05)' : 'transparent', 
              border: 'none', 
              padding: '0.5rem 1rem', 
              borderRadius: '9999px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            <div className="identity-text" style={{ textAlign: 'left' }}>
              <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                {currentUser ? currentUser.residentName : 'WG Hub'}
              </h1>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280', display: 'none' }}>{headerSlogan}</p>
            </div>
            <span
              className={`identity-chevron ${isProfileOpen ? 'open' : ''}`}
              aria-hidden="true"
              style={{ 
                color: '#6b7280', 
                transform: isProfileOpen ? 'rotate(180deg)' : 'rotate(0)', 
                transition: 'transform 0.2s',
                fontSize: '0.875rem'
              }}
            >
              ▼
            </span>
          </button>

          {isProfileOpen ? (
            <div className="profile-panel card" style={{
              position: 'absolute',
              top: 'calc(100% + 0.5rem)',
              left: 0,
              background: '#fff',
              borderRadius: '16px',
              padding: '1rem',
              minWidth: '220px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
              border: '1px solid rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profil</h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#374151', fontWeight: '500' }}>
                {currentUser ? currentUser.username : '-'}
              </p>
              <button
                type="button"
                className="resident-option"
                onClick={() => {
                  setIsProfileOpen(false);
                  if (onOpenSettings) onOpenSettings();
                }}
                style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.875rem', color: '#4b5563' }}
                onMouseOver={(e) => { e.target.style.background = '#f3f4f6'; e.target.style.color = '#111827'; }}
                onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#4b5563'; }}
              >
                Passwort ändern
              </button>
              <button
                type="button"
                className="resident-option"
                onClick={() => {
                  setIsProfileOpen(false);
                  if (onLogout) onLogout();
                }}
                style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.875rem', color: '#ef4444' }}
                onMouseOver={(e) => { e.target.style.background = '#fee2e2'; e.target.style.color = '#dc2626'; }}
                onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#ef4444'; }}
              >
                Abmelden
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="topbar-actions">
        <nav className="desktop-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${activeView === item.id ? 'active' : ''}`}
              onClick={() => handleSelect(item.id)}
            >
              <span className="nav-icon" style={{ marginRight: '0.5rem' }}>{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="burger-menu">
        <button
          type="button"
          className="burger-button"
          aria-expanded={isNavOpen}
          aria-label="Navigation öffnen"
          onClick={() => {
            setIsNavOpen((current) => !current);
            setIsProfileOpen(false);
          }}
        >
          <span />
          <span />
          <span />
        </button>

        {isNavOpen ? (
          <nav className="burger-panel card" aria-label="Unterseiten">
            <ul>
              {navItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                    onClick={() => handleSelect(item.id)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        </div>
      </div>
    </header>
  );
}

export default Header;



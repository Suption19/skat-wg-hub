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
  residents,
  activeResidentId,
  onChangeActiveResidentId,
}) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [headerSlogan] = useState(
    () => HEADER_SLOGANS[Math.floor(Math.random() * HEADER_SLOGANS.length)]
  );

  const activeResident =
    residents.find((resident) => resident.id === activeResidentId) || null;
  const visual = getResidentVisual(activeResident ? activeResident.name : '');

  function handleSelect(viewId) {
    onChangeView(viewId);
    setIsNavOpen(false);
  }

  return (
    <header className="topbar">
      <div className="profile-identity">
        <button
          type="button"
          className="resident-avatar-button"
          aria-label="Zur Startseite"
          onClick={() => {
            onChangeView('dashboard');
            setIsNavOpen(false);
            setIsProfileOpen(false);
          }}
        >
          <span
            className="resident-avatar-large"
            style={{ backgroundColor: visual.color }}
            aria-hidden="true"
          >
            {visual.avatar}
          </span>
        </button>
        <div className="profile-menu profile-menu-inline">
          <button
            type="button"
            className="identity-trigger"
            aria-expanded={isProfileOpen}
            aria-label="Profil wechseln"
            onClick={() => {
              setIsProfileOpen((current) => !current);
              setIsNavOpen(false);
            }}
          >
            <span
              className={`identity-chevron ${isProfileOpen ? 'open' : ''}`}
              aria-hidden="true"
            >
              ▾
            </span>
            <div className="identity-text">
              <h1>{activeResident ? activeResident.name : 'WG Hub'}</h1>
              <p>{headerSlogan}</p>
            </div>
          </button>

          {isProfileOpen ? (
            <div className="profile-panel card">
              <h3>Profil</h3>
              <p>Wähle aus, wer du bist.</p>
              <div className="resident-options">
                {residents.map((resident) => {
                  const optionVisual = getResidentVisual(resident.name);
                  const isActive = resident.id === activeResidentId;
                  return (
                    <button
                      key={resident.id}
                      type="button"
                      className={`resident-option ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        onChangeActiveResidentId(resident.id);
                        setIsProfileOpen(false);
                      }}
                    >
                      <span
                        className="resident-option-avatar"
                        style={{ backgroundColor: optionVisual.color }}
                        aria-hidden="true"
                      >
                        {optionVisual.avatar}
                      </span>
                      <span>{resident.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="topbar-actions">
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



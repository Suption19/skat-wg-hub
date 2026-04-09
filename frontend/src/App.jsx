import { useEffect, useMemo, useState } from 'react';

import { requestJson } from './api';
import Header from './components/Header';
import AbsencesSection from './components/AbsencesSection';
import DashboardOverview from './components/DashboardOverview';
import LoginPage from './components/LoginPage';
import PasswordSettingsSection from './components/PasswordSettingsSection';
import SkatSection from './components/SkatSection';
import TaskStatusSection from './components/TaskStatusSection';
import TasksSection from './components/TasksSection';
import ResidentsSection from './components/ResidentsSection';

const baseNavItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'tasks', label: 'Aufgabenplan' },
  { id: 'taskStatus', label: 'Aufgabenstatus' },
  { id: 'skat', label: 'Skat' },
  { id: 'absences', label: 'Abwesenheiten' },
];

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [residents, setResidents] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const meRes = await requestJson('/api/auth/me');
        if (!mounted) return;

        setCurrentUser(meRes.user || null);

        const response = await requestJson('/api/residents');
        if (!mounted) return;

        const items = response.items || [];
        setResidents(items);
      } catch (error) {
        if (mounted) {
          if (error.status === 401) {
            setCurrentUser(null);
          }
          setResidents([]);
        }
      } finally {
        if (mounted) {
          setIsAuthLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogin(credentials) {
    const response = await requestJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    setCurrentUser(response.user || null);
    const residentsRes = await requestJson('/api/residents');
    setResidents(residentsRes.items || []);
  }

  async function handleRegister(credentials) {
    const response = await requestJson('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    setCurrentUser(response.user || null);
    const residentsRes = await requestJson('/api/residents');
    setResidents(residentsRes.items || []);
  }

  async function handleLogout() {
    try {
      await requestJson('/api/auth/logout', { method: 'POST' });
    } finally {
      setCurrentUser(null);
      setResidents([]);
      setActiveView('dashboard');
    }
  }

  const navItems = useMemo(() => {
    const items = [...baseNavItems];
    if (currentUser?.isAdmin) {
      items.push({ id: 'residents', label: 'Bewohner' });
    }
    return items;
  }, [currentUser]);

  const activeResidentId = currentUser ? currentUser.residentId : null;

  const activeContent = useMemo(() => {
    if (activeView === 'settings') {
      return <PasswordSettingsSection onPasswordChanged={setCurrentUser} />;
    }
    if (activeView === 'residents') return <ResidentsSection isAdmin={currentUser?.isAdmin} />;
    if (activeView === 'tasks') return <TasksSection />;
    if (activeView === 'taskStatus') return <TaskStatusSection />;
    if (activeView === 'skat') return <SkatSection />;
    if (activeView === 'absences') return <AbsencesSection />;
    return (
      <DashboardOverview
        residents={residents}
        activeResidentId={activeResidentId}
        onOpenSkat={() => setActiveView('skat')}
      />
    );
  }, [activeView, residents, activeResidentId]);

  if (isAuthLoading) {
    return (
      <div className="app-shell">
        <main className="card data-section">
          <p>Lade Session...</p>
        </main>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} onRegister={handleRegister} />;
  }

  return (
    <div className="app-shell">
      <Header
        navItems={navItems}
        activeView={activeView}
        onChangeView={setActiveView}
        currentUser={currentUser}
        onOpenSettings={() => setActiveView('settings')}
        onLogout={handleLogout}
      />
      <div className="layout">
        <main className="dashboard">{activeContent}</main>
      </div>
    </div>
  );
}

export default App;


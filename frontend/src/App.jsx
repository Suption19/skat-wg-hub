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
import WasteDatesSection from './components/WasteDatesSection';
import SettingsSection from './components/SettingsSection';
import ExpensesSection from './components/ExpensesSection';

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [residents, setResidents] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [hiddenTabs, setHiddenTabs] = useState([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const meRes = await requestJson('/api/auth/me');
        if (!mounted) return;

        setCurrentUser(meRes.user || null);

        if (meRes.user) {
          try {
             // requestJson won't crash if route doesn't exist, we wrap it in try-catch
             const settingsRes = await requestJson('/api/settings/hidden_tabs');
             if (mounted) {
               setHiddenTabs(settingsRes.hidden_tabs || settingsRes.hiddenTabs || []);
             }
          } catch(e) {
             console.warn('Could not load hidden_tabs', e);
          }
        }

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
    if (response.user) {
      try {
        const settingsRes = await requestJson('/api/settings/hidden_tabs');
        setHiddenTabs(settingsRes.hidden_tabs || settingsRes.hiddenTabs || []);
      } catch (e) {}
    }
    const residentsRes = await requestJson('/api/residents');
    setResidents(residentsRes.items || []);
  }

  async function handleRegister(credentials) {
    const response = await requestJson('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    setCurrentUser(response.user || null);
    if (response.user) {
      try {
        const settingsRes = await requestJson('/api/settings/hidden_tabs');
        setHiddenTabs(settingsRes.hidden_tabs || settingsRes.hiddenTabs || []);
      } catch (e) {}
    }
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
    let items = [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'tasks', label: 'Aufgabenplan' },
      { id: 'taskStatus', label: 'Aufgabenstatus' },
      { id: 'skat', label: 'Skat' },
      { id: 'absences', label: 'Abwesenheiten' },
      { id: 'expenses', label: 'Ausgaben' },
    ];

    if (currentUser?.isAdmin) {
      items.push({ id: 'wasteDates', label: 'Abfuhrkalender' });
      items.push({ id: 'residents', label: 'Bewohner' });
      items.push({ id: 'settings', label: 'Einstellungen' });
    } else {
      items = items.filter(item => !hiddenTabs.includes(item.id));
    }

    return items;
  }, [currentUser, hiddenTabs]);

  const activeResidentId = currentUser ? currentUser.residentId : null;

  const activeContent = useMemo(() => {
    if (activeView === 'settings') {
      return (
        <>
          <PasswordSettingsSection onPasswordChanged={setCurrentUser} />
          {currentUser?.isAdmin && <SettingsSection />}
        </>
      );
    }
    if (activeView === 'residents' && currentUser?.isAdmin) return <ResidentsSection isAdmin={currentUser?.isAdmin} />;
    if (activeView === 'tasks') return <TasksSection />;
    if (activeView === 'taskStatus') return <TaskStatusSection />;
    if (activeView === 'wasteDates' && currentUser?.isAdmin) return <WasteDatesSection />;
    if (activeView === 'expenses') return <ExpensesSection residents={residents} />;
    if (activeView === 'skat') return <SkatSection />;
    if (activeView === 'absences') return <AbsencesSection />;
    return (
      <DashboardOverview
        residents={residents}
        activeResidentId={activeResidentId}
        onOpenSkat={() => setActiveView('skat')}
      />
    );
  }, [activeView, residents, activeResidentId, currentUser]);

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


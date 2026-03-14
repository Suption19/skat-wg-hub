import { useEffect, useMemo, useState } from 'react';

import { requestJson } from './api';
import Header from './components/Header';
import AbsencesSection from './components/AbsencesSection';
import DashboardOverview from './components/DashboardOverview';
import TaskStatusSection from './components/TaskStatusSection';
import TasksSection from './components/TasksSection';

const navItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'tasks', label: 'Aufgabenplan' },
  { id: 'taskStatus', label: 'Aufgabenstatus' },
  { id: 'absences', label: 'Abwesenheiten' },
];

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [residents, setResidents] = useState([]);
  const [activeResidentId, setActiveResidentId] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadResidents() {
      try {
        const response = await requestJson('/api/residents');
        if (!mounted) return;

        const items = response.items || [];
        setResidents(items);

        const stored = localStorage.getItem('wgHub.activeResidentId');
        const storedId = stored ? Number(stored) : null;
        const storedExists = items.some((resident) => resident.id === storedId);

        const nextResidentId = storedExists
          ? storedId
          : (items[0] ? items[0].id : null);

        setActiveResidentId(nextResidentId);
      } catch (error) {
        if (mounted) {
          setResidents([]);
          setActiveResidentId(null);
        }
      }
    }

    loadResidents();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (activeResidentId) {
      localStorage.setItem('wgHub.activeResidentId', String(activeResidentId));
    }
  }, [activeResidentId]);

  const activeContent = useMemo(() => {
    if (activeView === 'tasks') return <TasksSection />;
    if (activeView === 'taskStatus') return <TaskStatusSection />;
    if (activeView === 'absences') return <AbsencesSection />;
    return (
      <DashboardOverview
        residents={residents}
        activeResidentId={activeResidentId}
      />
    );
  }, [activeView, residents, activeResidentId]);

  return (
    <div className="app-shell">
      <Header
        navItems={navItems}
        activeView={activeView}
        onChangeView={setActiveView}
        residents={residents}
        activeResidentId={activeResidentId}
        onChangeActiveResidentId={setActiveResidentId}
      />
      <div className="layout">
        <main className="dashboard">{activeContent}</main>
      </div>
    </div>
  );
}

export default App;


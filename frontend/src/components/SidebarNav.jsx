const navItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'residents', label: 'Bewohner' },
  { id: 'tasks', label: 'Aufgaben' },
  { id: 'absences', label: 'Abwesenheiten' },
  { id: 'wasteDates', label: 'Muelltermine' },
];

function SidebarNav({ activeView, onChangeView }) {
  return (
    <aside className="sidebar card">
      <nav>
        <ul>
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                onClick={() => onChangeView(item.id)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default SidebarNav;


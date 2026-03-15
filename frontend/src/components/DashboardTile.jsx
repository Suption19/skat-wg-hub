function DashboardTile({ title, icon, tone, leftStat, rightStat }) {
  return (
    <article className={`overview-tile ${tone}`}>
      <header className="overview-header">
        <div className="overview-title-wrap">
          <span className="overview-icon" aria-hidden="true">
            {icon}
          </span>
          <h3>{title}</h3>
        </div>
        <span className="overview-arrow" aria-hidden="true">
          {'>'}
        </span>
      </header>

      <div className="overview-stats">
        <div className="overview-stat-box">
          <strong>{leftStat.value}</strong>
          <span>{leftStat.label}</span>
        </div>
        <div className="overview-stat-box">
          <strong>{rightStat.value}</strong>
          <span>{rightStat.label}</span>
        </div>
      </div>
    </article>
  );
}

export default DashboardTile;


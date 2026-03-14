function DashboardCard({ title, value, meta, items }) {
  return (
    <article className="card dashboard-card">
      <header>
        <h3>{title}</h3>
        <p className="card-value">{value}</p>
        <p className="card-meta">{meta}</p>
      </header>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

export default DashboardCard;


export default function ProgressSummary({ items = [], className = "" }) {
  return (
    <dl className={`pac-progress-summary ${className}`.trim()}>
      {items.map((item) => (
        <div key={item.label} className="pac-progress-summary__item">
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
          {item.description && <p>{item.description}</p>}
        </div>
      ))}
    </dl>
  );
}

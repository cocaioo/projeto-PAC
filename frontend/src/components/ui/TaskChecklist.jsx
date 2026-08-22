export default function TaskChecklist({ title = "Antes de enviar", items = [] }) {
  return (
    <section className="pac-checklist" aria-labelledby="draft-checklist-title">
      <h2 id="draft-checklist-title">{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item.label} className={item.done ? "is-done" : ""}>
            <span className="pac-checklist__mark" aria-hidden="true">
              <i className={`bi ${item.done ? "bi-check-circle-fill" : "bi-circle"}`} />
            </span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

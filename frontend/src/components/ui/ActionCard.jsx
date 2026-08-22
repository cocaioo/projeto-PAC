import { Link } from "react-router-dom";

export default function ActionCard({
  title,
  description,
  to,
  icon = "bi-arrow-right-circle",
  actionLabel,
  priority = "normal",
  meta,
}) {
  return (
    <section className={`pac-action-card pac-action-card--${priority}`}>
      <div className="pac-action-card__icon" aria-hidden="true">
        <i className={`bi ${icon}`} />
      </div>
      <div className="pac-action-card__content">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        {meta && <div className="pac-action-card__meta">{meta}</div>}
      </div>
      {to && actionLabel && (
        <Link to={to} className={`pac-button ${priority === "required" ? "pac-button--primary" : "pac-button--secondary"}`}>
          {actionLabel}
          <i className="bi bi-chevron-right" aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}

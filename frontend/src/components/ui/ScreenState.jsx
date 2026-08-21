export function EmptyState({ title = "Nenhum registro encontrado", description, icon = "bi-inbox", action }) {
  return (
    <div className="pac-state">
      <div>
        <i className={`bi ${icon} pac-state__icon`} aria-hidden="true" />
        <h2 className="pac-state__title">{title}</h2>
        {description && <p className="pac-state__description">{description}</p>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

export function LoadingState({ label = "Carregando..." }) {
  return (
    <div className="pac-state" role="status" aria-live="polite">
      <div>
        <span className="spinner-border text-primary" aria-hidden="true" />
        <p className="pac-state__description">{label}</p>
      </div>
    </div>
  );
}

export default function PageHeader({ title, description, actions, eyebrow }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <div className="text-uppercase small text-muted fw-semibold mb-1">{eyebrow}</div>}
        <h1 className="page-header__title">{title}</h1>
        {description && <p className="page-header__description">{description}</p>}
      </div>
      {actions && <div className="d-flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

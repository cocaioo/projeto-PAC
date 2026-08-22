export default function Card({ title, actions, footer, children, className = "", ...props }) {
  return (
    <section className={`pac-card ${className}`.trim()} {...props}>
      {(title || actions) && (
        <header className="pac-card__header">
          {title && <h2 className="pac-card__title">{title}</h2>}
          {actions}
        </header>
      )}
      <div className="pac-card__body">{children}</div>
      {footer && <footer className="pac-card__footer">{footer}</footer>}
    </section>
  );
}

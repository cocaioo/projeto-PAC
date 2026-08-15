import { useEffect, useId, useRef } from "react";
import Button from "./Button";

export default function Modal({ open, title, children, footer, onClose, closeLabel = "Fechar" }) {
  const titleId = useId();
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    dialogRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="pac-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <section
        className="pac-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={dialogRef}
      >
        <header className="pac-modal__header">
          <h2 id={titleId} className="h5 mb-0">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={closeLabel}>
            <i className="bi bi-x-lg" aria-hidden="true" />
          </Button>
        </header>
        <div className="pac-modal__body">{children}</div>
        {footer && <footer className="pac-modal__footer">{footer}</footer>}
      </section>
    </div>
  );
}

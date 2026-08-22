import { Button } from "./ui";

export function InlineMessage({ variant = "info", title, children, onDismiss }) {
  return (
    <div className={`alert alert-${variant} d-flex align-items-start gap-2`} role={variant === "danger" ? "alert" : "status"}>
      <i className={`bi ${variant === "danger" ? "bi-exclamation-octagon" : "bi-info-circle"}`} aria-hidden="true" />
      <div className="flex-grow-1">
        {title && <strong className="d-block">{title}</strong>}
        {children}
      </div>
      {onDismiss && (
        <Button variant="ghost" size="sm" onClick={onDismiss} aria-label="Fechar mensagem">
          <i className="bi bi-x-lg" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

export default function ApiErrorMessage({ error, onRetry, title = "Não foi possível concluir" }) {
  if (!error) return null;
  const fallbackMessage = typeof error === "string" ? error : error?.message;
  const mensagemSegura = fallbackMessage && !/(traceback|stack trace|\bat\s+\S+\s*\(|\w+error:\s.*\n)/i.test(fallbackMessage)
    ? fallbackMessage
    : "Não foi possível concluir a solicitação.";
  const apiError = error && typeof error === "object"
    ? { ...error, message: mensagemSegura }
    : { message: mensagemSegura, fieldErrors: {} };
  const fieldEntries = Object.entries(apiError.fieldErrors || {});

  return (
    <InlineMessage variant="danger" title={title}>
      <p className="mb-1">{apiError.message}</p>
      {fieldEntries.length > 0 && (
        <ul className="mb-2 ps-3">
          {fieldEntries.flatMap(([field, messages]) => messages.map((message) => (
            <li key={`${field}-${message}`}><strong>{field}:</strong> {message}</li>
          )))}
        </ul>
      )}
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Tentar novamente</Button>}
    </InlineMessage>
  );
}

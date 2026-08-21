import { useId } from "react";

function Field({ id, label, hint, error, required, children }) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="pac-field">
      {label && (
        <label className="pac-field__label" htmlFor={fieldId}>
          {label}{required && <span aria-hidden="true"> *</span>}
        </label>
      )}
      {children({ id: fieldId, describedBy })}
      {hint && <div className="pac-field__hint" id={hintId}>{hint}</div>}
      {error && <div className="pac-field__error" id={errorId} role="alert">{error}</div>}
    </div>
  );
}

function control(Component, defaultProps = {}) {
  return function FormControl({ id, label, hint, error, required, className = "", children, ...props }) {
    return (
      <Field id={id} label={label} hint={hint} error={error} required={required}>
        {({ id: fieldId, describedBy }) => (
          <Component
            id={fieldId}
            className={`pac-input ${className}`.trim()}
            required={required}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={describedBy}
            {...defaultProps}
            {...props}
          >
            {children}
          </Component>
        )}
      </Field>
    );
  };
}

export const Input = control("input");
export const Select = control("select");
export const Textarea = control("textarea");

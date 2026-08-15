export default function Button({
  children,
  variant = "primary",
  size,
  loading = false,
  className = "",
  disabled,
  type = "button",
  ...props
}) {
  const classes = [
    "pac-button",
    `pac-button--${variant}`,
    size ? `pac-button--${size}` : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="spinner-border spinner-border-sm" aria-hidden="true" />}
      {children}
    </button>
  );
}

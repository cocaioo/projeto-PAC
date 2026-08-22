export default function Badge({ children, variant = "neutral", icon, className = "", ...props }) {
  return (
    <span className={`pac-badge pac-badge--${variant} ${className}`.trim()} {...props}>
      {icon && <i className={`bi ${icon}`} aria-hidden="true" />}
      {children}
    </span>
  );
}

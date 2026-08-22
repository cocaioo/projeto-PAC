import { Link } from "react-router-dom";

const ICONS = {
  required: "bi-exclamation-circle",
  waiting: "bi-hourglass-split",
  follow: "bi-arrow-right-circle",
  view: "bi-folder2-open",
};

export default function NextAction({ action, compact = false, button = false }) {
  if (!action) return null;
  const icon = ICONS[action.actionType] || "bi-arrow-right-circle";
  const content = (
    <>
      <i className={`bi ${icon}`} aria-hidden="true" />
      <span>{action.label}</span>
    </>
  );

  if (button && action.route && !action.disabled) {
    return (
      <Link to={action.route} className="pac-button pac-button--primary">
        {content}
      </Link>
    );
  }

  return (
    <div className={`pac-next-action pac-next-action--${action.actionType || "follow"}${compact ? " pac-next-action--compact" : ""}`}>
      <div className="pac-next-action__label">{content}</div>
      {!compact && action.description && (
        <div className="pac-next-action__description">{action.description}</div>
      )}
    </div>
  );
}

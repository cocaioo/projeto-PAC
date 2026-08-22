export default function ActionBar({ children, summary }) {
  return (
    <div className="pac-action-bar">
      {summary && <div className="pac-action-bar__summary">{summary}</div>}
      <div className="pac-action-bar__actions">{children}</div>
    </div>
  );
}

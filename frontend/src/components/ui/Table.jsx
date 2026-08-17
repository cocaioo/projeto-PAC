export default function Table({ children, caption, className = "", ...props }) {
  return (
    <div className="pac-table-wrap" data-scroll-direction="horizontal">
      <table className={`pac-table ${className}`.trim()} {...props}>
        {caption && <caption className="visually-hidden">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

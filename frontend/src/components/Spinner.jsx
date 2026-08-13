// Indicador de carregamento reutilizável.
export default function Spinner({ label = "Carregando..." }) {
  return (
    <div className="text-center py-5" role="status">
      <div className="spinner-border text-primary" aria-hidden="true"></div>
      <p className="mt-2 text-muted">{label}</p>
    </div>
  );
}

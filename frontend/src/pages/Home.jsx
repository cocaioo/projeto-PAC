import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Home() {
  const { user } = useAuth();

  return (
    <div>
      <div className="p-5 mb-4 bg-light rounded-3">
        <h1 className="display-6 fw-bold">
          <i className="bi bi-clipboard-data me-2"></i>PAC UFPI
        </h1>
        <p className="lead">
          Sistema de Gestão do Plano Anual de Contratações da UFPI.
        </p>
        {user ? (
          <p className="text-muted">
            Bem-vindo(a), {user.nome_completo || user.username}.
          </p>
        ) : (
          <Link to="/login" className="btn btn-primary">
            Entrar
          </Link>
        )}
      </div>

      {user && (
        <div className="row g-3">
          <div className="col-md-4">
            <Link to="/demandas" className="text-decoration-none">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h5 className="card-title">
                    <i className="bi bi-file-earmark-text me-2"></i>Demandas
                  </h5>
                  <p className="card-text text-muted">
                    Cadastre e acompanhe suas demandas de contratação.
                  </p>
                </div>
              </div>
            </Link>
          </div>
          <div className="col-md-4">
            <Link to="/catalogo" className="text-decoration-none">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h5 className="card-title">
                    <i className="bi bi-box-seam me-2"></i>Catálogo
                  </h5>
                  <p className="card-text text-muted">
                    Consulte itens e serviços disponíveis.
                  </p>
                </div>
              </div>
            </Link>
          </div>
          <div className="col-md-4">
            <Link to="/dashboard" className="text-decoration-none">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h5 className="card-title">
                    <i className="bi bi-speedometer2 me-2"></i>Dashboard
                  </h5>
                  <p className="card-text text-muted">
                    Acompanhe indicadores do PAC.
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

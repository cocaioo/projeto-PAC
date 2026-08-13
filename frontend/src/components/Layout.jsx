import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

// Casca da aplicação: navbar + área de conteúdo (Outlet) + rodapé.
export default function Layout() {
  const { user, isStaff, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="d-flex flex-column min-vh-100">
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
        <div className="container-fluid">
          <Link className="navbar-brand fw-bold" to="/">
            <i className="bi bi-clipboard-data me-2"></i>PAC UFPI
          </Link>

          <div className="collapse navbar-collapse show">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <NavLink className="nav-link" to="/">
                  Início
                </NavLink>
              </li>
              {user && (
                <>
                  <li className="nav-item">
                    <NavLink className="nav-link" to="/demandas">
                      Demandas
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink className="nav-link" to="/catalogo">
                      Catálogo
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink className="nav-link" to="/dashboard">
                      Dashboard
                    </NavLink>
                  </li>
                </>
              )}
              {isStaff && (
                <>
                  <li className="nav-item">
                    <NavLink className="nav-link" to="/validacoes">
                      Validações
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink className="nav-link" to="/dfds">
                      DFDs
                    </NavLink>
                  </li>
                </>
              )}
            </ul>

            <ul className="navbar-nav">
              {user ? (
                <li className="nav-item d-flex align-items-center gap-2">
                  <span className="navbar-text text-white">
                    <i className="bi bi-person-circle me-1"></i>
                    {user.nome_completo || user.username}
                  </span>
                  <button
                    className="btn btn-outline-light btn-sm"
                    onClick={handleLogout}
                  >
                    Sair
                  </button>
                </li>
              ) : (
                <li className="nav-item">
                  <NavLink className="nav-link" to="/login">
                    Entrar
                  </NavLink>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>

      <main className="container py-4 flex-grow-1">
        <Outlet />
      </main>

      <footer className="bg-light text-center text-muted py-3 mt-auto border-top">
        <small>
          PAC UFPI — Sistema de Gestão do Plano Anual de Contratações
        </small>
      </footer>
    </div>
  );
}

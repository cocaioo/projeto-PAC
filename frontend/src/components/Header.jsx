import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui";

const ROLE_LABELS = {
  usuario: "Usuário",
  admin: "Administrador",
  admin_master: "Administrador Master",
};

export default function Header({ user, logout }) {
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <header className="app-header">
      {user ? (
        <>
          <div className="app-header__identity">
            <strong>{user.nome_completo || user.username}</strong>
            <span className="app-header__role">
              {ROLE_LABELS[user.perfil]
                || (user.is_admin_master_user
                  ? "Administrador Master"
                  : user.is_admin_user ? "Administrador" : "Usuário")}
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right" aria-hidden="true" /> Sair
          </Button>
        </>
      ) : (
        <Link className="pac-button pac-button--primary pac-button--sm" to="/login">Entrar</Link>
      )}
    </header>
  );
}

import { Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  const { user, isAdmin, logout } = useAuth();
  const admin = Boolean(
    isAdmin
      || user?.is_admin_user
      || user?.perfil === "admin"
      || user?.perfil === "admin_master"
  );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#conteudo-principal">Pular para o conteúdo</a>
      <Sidebar user={user} isAdmin={admin} />
      <div className="app-main">
        <Header user={user} logout={logout} />
        <main
          className="app-content"
          data-scroll-container="main"
          id="conteudo-principal"
          tabIndex={-1}
        >
          <div className="app-content__inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

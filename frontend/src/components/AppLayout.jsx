import { Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  // Bug #3: usar isAdmin diretamente do AuthContext sem recalcular os critérios de perfil.
  const { user, isAdmin, logout } = useAuth();

  return (
    <div className="app-shell">
      <a className="skip-link" href="#conteudo-principal">Pular para o conteúdo</a>
      <Sidebar user={user} isAdmin={isAdmin} />
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

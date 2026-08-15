import { Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  const { user, isAdmin, isStaff, logout } = useAuth();
  const admin = isAdmin ?? isStaff ?? Boolean(user?.is_staff);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#conteudo-principal">Pular para o conteúdo</a>
      <Sidebar user={user} isAdmin={admin} />
      <div className="app-main">
        <Header user={user} logout={logout} />
        <main className="app-content" id="conteudo-principal" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

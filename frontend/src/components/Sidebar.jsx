import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const commonLinks = [
  { to: "/", label: "Início", icon: "bi-house" },
];

const userLinks = [
  { to: "/demandas", label: "Minhas demandas", icon: "bi-file-earmark-text" },
];

const sharedLinks = [
  { to: "/catalogo", label: "Catálogo", icon: "bi-box-seam" },
  { to: "/dashboard", label: "Indicadores", icon: "bi-bar-chart" },
  { to: "/conta", label: "Minha conta", icon: "bi-person" },
];

const adminLinks = [
  { to: "/validacoes", label: "Pendências de validação", icon: "bi-check2-square" },
  { to: "/demandas", label: "Todas as Demandas", icon: "bi-files" },
  { to: "/dfds", label: "Documentos DFD", icon: "bi-collection" },
];

const adminMasterLinks = [
  { to: "/gestao/usuarios", label: "Gestão de Usuários", icon: "bi-people" },
];

function MenuLink({ item }) {
  return (
    <NavLink to={item.to} end={item.to === "/"} className="app-sidebar__link">
      <i className={`bi ${item.icon}`} aria-hidden="true" />
      <span>{item.label}</span>
    </NavLink>
  );
}

export default function Sidebar({ user, isAdmin }) {
  const { isAdminMaster } = useAuth();
  return (
    <aside className="app-sidebar" aria-label="Navegação principal">
      <Link className="app-brand" to="/">
        <span className="app-brand__mark"><i className="bi bi-clipboard-data" aria-hidden="true" /></span>
        <span>PAC UFPI</span>
      </Link>
      <nav className="app-sidebar__nav">
        <div className="app-sidebar__section">Principal</div>
        {commonLinks.map((item) => <MenuLink item={item} key={item.to} />)}
        
        {user && !isAdmin && (
          <>
            <div className="app-sidebar__section">Área do requisitante</div>
            {userLinks.map((item) => <MenuLink item={item} key={item.to} />)}
          </>
        )}
        
        {isAdmin && (
          <>
            <div className="app-sidebar__section">Administração</div>
            {adminLinks.map((item) => <MenuLink item={item} key={item.to} />)}
          </>
        )}

        {user && (
          <>
            <div className="app-sidebar__section">Geral</div>
            {sharedLinks.map((item) => <MenuLink item={item} key={item.to} />)}
          </>
        )}

        {isAdminMaster && (
          <>
            <div className="app-sidebar__section">Admin Master</div>
            {adminMasterLinks.map((item) => <MenuLink item={item} key={item.to} />)}
          </>
        )}
      </nav>
      <div className="app-sidebar__footer">Plano Anual de Contratações</div>
    </aside>
  );
}

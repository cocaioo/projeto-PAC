import { Link, NavLink } from "react-router-dom";

const userLinks = [
  { to: "/", label: "Início", icon: "bi-house" },
  { to: "/demandas", label: "Demandas", icon: "bi-file-earmark-text" },
  { to: "/catalogo", label: "Catálogo", icon: "bi-box-seam" },
  { to: "/dashboard", label: "Dashboard", icon: "bi-bar-chart" },
];

const adminLinks = [
  { to: "/validacoes", label: "Validações", icon: "bi-check2-square" },
  { to: "/dfds", label: "DFDs", icon: "bi-collection" },
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
  return (
    <aside className="app-sidebar" aria-label="Navegação principal">
      <Link className="app-brand" to="/">
        <span className="app-brand__mark"><i className="bi bi-clipboard-data" aria-hidden="true" /></span>
        <span>PAC UFPI</span>
      </Link>
      <nav className="app-sidebar__nav">
        <div className="app-sidebar__section">Principal</div>
        <MenuLink item={userLinks[0]} />
        {user && userLinks.slice(1).map((item) => <MenuLink item={item} key={item.to} />)}
        {isAdmin && (
          <>
            <div className="app-sidebar__section">Administração</div>
            {adminLinks.map((item) => <MenuLink item={item} key={item.to} />)}
          </>
        )}
      </nav>
      <div className="app-sidebar__footer">Plano Anual de Contratações</div>
    </aside>
  );
}

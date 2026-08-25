import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./auth/AuthContext";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Catalogo from "./pages/Catalogo";
import DemandaList from "./pages/DemandaList";
import DemandaForm from "./pages/DemandaForm";
import DemandaDetail from "./pages/DemandaDetail";
import ItemForm from "./pages/ItemForm";
import ValidacoesList from "./pages/ValidacoesList";
import ValidacaoDecisao from "./pages/ValidacaoDecisao";
import DfdList from "./pages/DfdList";
import DfdDetail from "./pages/DfdDetail";
import DfdConsolidar from "./pages/DfdConsolidar";
import SolicitarAcesso from "./pages/SolicitarAcesso";
import AdminUsuarios from "./pages/AdminUsuarios";
import Profile from "./pages/Profile";
import ChangePassword from "./pages/ChangePassword";

const auth = (el) => <ProtectedRoute>{el}</ProtectedRoute>;
const admin = (el) => <ProtectedRoute adminOnly>{el}</ProtectedRoute>;
const adminMaster = (el) => <ProtectedRoute adminMasterOnly>{el}</ProtectedRoute>;

function PasswordChangeGate({ children }) {
  const { user, loading } = useAuth();

  if (!loading && user?.precisa_trocar_senha) {
    return <Navigate to="/trocar-senha" replace />;
  }

  return children;
}

const passwordGate = (el) => <PasswordChangeGate>{el}</PasswordChangeGate>;

// Definição central das rotas da SPA.
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={passwordGate(<Login />)} />
      <Route path="/solicitar-acesso" element={passwordGate(<SolicitarAcesso />)} />
      <Route path="/trocar-senha" element={auth(<ChangePassword />)} />

      <Route element={passwordGate(<Layout />)}>
        <Route index element={<Home />} />

        {/* Demandas */}
        <Route path="demandas" element={auth(<DemandaList />)} />
        <Route path="demandas/nova" element={auth(<DemandaForm />)} />
        <Route path="demandas/:id" element={auth(<DemandaDetail />)} />
        <Route path="demandas/:id/editar" element={auth(<DemandaForm />)} />
        <Route path="demandas/:id/itens/novo" element={auth(<ItemForm />)} />
        <Route path="demandas/:id/itens/:itemId/editar" element={auth(<ItemForm />)} />

        {/* Catálogo e Dashboard */}
        <Route path="catalogo" element={auth(<Catalogo />)} />
        <Route path="dashboard" element={auth(<Dashboard />)} />
        <Route path="conta" element={auth(<Profile />)} />

        {/* Validações (ADMIN) */}
        <Route path="validacoes" element={admin(<ValidacoesList />)} />
        <Route path="validacoes/:demandaId" element={admin(<ValidacaoDecisao />)} />

        {/* DFDs (ADMIN) */}
        <Route path="dfds" element={admin(<DfdList />)} />
        <Route path="dfds/consolidar" element={admin(<DfdConsolidar />)} />
        <Route path="dfds/:id" element={admin(<DfdDetail />)} />

        {/* ADMIN MASTER */}
        <Route path="gestao/usuarios" element={adminMaster(<AdminUsuarios />)} />

        {/* Fallback */}
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}

import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
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

const auth = (el) => <ProtectedRoute>{el}</ProtectedRoute>;
const staff = (el) => <ProtectedRoute staffOnly>{el}</ProtectedRoute>;

// Definição central das rotas da SPA.
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<Layout />}>
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

        {/* Validações (staff) */}
        <Route path="validacoes" element={staff(<ValidacoesList />)} />
        <Route path="validacoes/:demandaId" element={staff(<ValidacaoDecisao />)} />

        {/* DFDs (staff) */}
        <Route path="dfds" element={staff(<DfdList />)} />
        <Route path="dfds/consolidar" element={staff(<DfdConsolidar />)} />
        <Route path="dfds/:id" element={staff(<DfdDetail />)} />

        {/* Fallback */}
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}

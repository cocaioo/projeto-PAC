import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { LoadingState } from "./ui";

// Protege rotas autenticadas e, opcionalmente, recursos administrativos do PAC.
export default function ProtectedRoute({ children, adminOnly = false, adminMasterOnly = false }) {
  const { user, loading, isAdmin, isAdminMaster } = useAuth();

  if (loading) return <LoadingState label="Verificando acesso..." />;
  if (!user) return <Navigate to="/login" replace />;
  // Bug #2: usar isAdmin diretamente do AuthContext em vez de recalcular com os mesmos critérios.
  if (adminMasterOnly && !isAdminMaster) return <Navigate to="/" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;

  return children;
}

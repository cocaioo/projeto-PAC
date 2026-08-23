import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { LoadingState } from "./ui";

// Protege rotas autenticadas e, opcionalmente, recursos administrativos do PAC.
export default function ProtectedRoute({ children, adminOnly = false, adminMasterOnly = false }) {
  const { user, loading, isAdmin, isAdminMaster } = useAuth();
  const perfilAdministrativo = Boolean(
    isAdmin
      || user?.is_admin_user
      || user?.perfil === "admin"
      || user?.perfil === "admin_master"
  );

  if (loading) return <LoadingState label="Verificando acesso..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminMasterOnly && !isAdminMaster) return <Navigate to="/" replace />;
  if (adminOnly && !perfilAdministrativo) return <Navigate to="/" replace />;

  return children;
}

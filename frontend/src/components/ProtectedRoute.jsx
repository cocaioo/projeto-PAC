import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Spinner from "./Spinner";

// Protege rotas que exigem autenticação (e, opcionalmente, perfil staff).
export default function ProtectedRoute({ children, staffOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (staffOnly && !user.is_staff) return <Navigate to="/" replace />;

  return children;
}

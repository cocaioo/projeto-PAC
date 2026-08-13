import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    api
      .me()
      .then((u) => ativo && setUser(u))
      .catch(() => ativo && setUser(null))
      .finally(() => ativo && setLoading(false));
    return () => {
      ativo = false;
    };
  }, []);

  async function login(username, password) {
    // Garante o cookie CSRF antes de autenticar.
    await api.csrf();
    const usuario = await api.login(username, password);
    setUser(usuario);
    return usuario;
  }

  async function logout() {
    await api.logout();
    setUser(null);
  }

  const value = { user, loading, login, logout, isStaff: !!user?.is_staff };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  }
  return ctx;
}

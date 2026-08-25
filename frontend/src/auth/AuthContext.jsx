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

  async function changePassword(passwords) {
    const resposta = await api.changePassword(passwords);
    const respostaTemDadosDeUsuario = Boolean(
      resposta
      && typeof resposta === "object"
      && ("username" in resposta || "email" in resposta || "perfil" in resposta)
    );
    const usuarioAtualizado = resposta?.user
      || resposta?.usuario
      || (respostaTemDadosDeUsuario ? resposta : null);

    setUser((atual) => ({
      ...atual,
      ...(usuarioAtualizado || {}),
      precisa_trocar_senha: false,
    }));

    return resposta;
  }

  async function logout() {
    await api.logout();
    setUser(null);
  }

  const isAdmin = Boolean(
    user?.is_admin_user
      || user?.perfil === "admin"
      || user?.perfil === "admin_master"
  );
  const value = {
    user,
    loading,
    login,
    changePassword,
    logout,
    isAdmin,
    isAdminMaster: Boolean(
      user?.is_admin_master_user || user?.perfil === "admin_master"
    ),
    // Mantido durante a migração das telas antigas.
    isStaff: isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  }
  return ctx;
}

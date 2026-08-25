import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import ApiErrorMessage from "../components/ApiErrorMessage";
import { Button, Card, Input } from "../components/ui";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await login(username.trim(), password);
      navigate("/");
    } catch (err) {
      if (err?.status === 401 && (!err.data?.detail && !err.data?.message && !err.data?.error)) {
        setErro("Credenciais inválidas. Verifique seu e-mail/usuário e senha.");
      } else {
        setErro(err?.message || "Não foi possível entrar.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="standalone-page">
      <div className="row justify-content-center">
        <div className="col-md-5">
          <Card className="mt-4">
            <h1 className="h4 mb-3 text-center">
              <i className="bi bi-clipboard-data me-2"></i>PAC UFPI
            </h1>
            <p className="text-muted text-center mb-4">
              Acesse com seu e-mail institucional (@ufpi.edu.br) ou usuário e senha
            </p>

            <ApiErrorMessage error={erro} title="Não foi possível entrar" />

            <form onSubmit={handleSubmit}>
                <Input
                  id="username"
                  label="E-mail ou Usuário"
                  placeholder="ex: nome.sobrenome@ufpi.edu.br ou admin_master"
                  hint="Por padrão, utilize o e-mail cadastrado. Administradores e contas de teste podem utilizar o usuário."
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <Input
                  id="password"
                  type="password"
                  label="Senha"
                  placeholder="Sua senha de acesso"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              <Button
                type="submit"
                className="w-100 mb-2"
                loading={enviando}
              >
                {enviando ? "Entrando..." : "Entrar"}
              </Button>
              <div className="text-center mt-3">
                <a
                  href="/solicitar-acesso"
                  className="text-decoration-none"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/solicitar-acesso");
                  }}
                >
                  Solicitar acesso / Criar conta
                </a>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
}

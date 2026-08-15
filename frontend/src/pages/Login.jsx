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
      await login(username, password);
      navigate("/");
    } catch (err) {
      setErro(err.message || "Não foi possível entrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-5">
        <Card className="mt-4">
            <h1 className="h4 mb-3 text-center">
              <i className="bi bi-clipboard-data me-2"></i>PAC UFPI
            </h1>
            <p className="text-muted text-center mb-4">Acesso ao sistema</p>

            <ApiErrorMessage error={erro} title="Não foi possível entrar" />

            <form onSubmit={handleSubmit}>
                <Input
                  id="username"
                  label="Usuário"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <Input
                  id="password"
                  type="password"
                  label="Senha"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              <Button
                type="submit"
                className="w-100"
                loading={enviando}
              >
                {enviando ? "Entrando..." : "Entrar"}
              </Button>
            </form>
        </Card>
      </div>
    </div>
  );
}

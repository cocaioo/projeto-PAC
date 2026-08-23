import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, extractFieldErrors } from "../api/client";
import ApiErrorMessage from "../components/ApiErrorMessage";
import { Button, Card, Input } from "../components/ui";

export default function SolicitarAcesso() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [unidade, setUnidade] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");

  const [unidades, setUnidades] = useState([]);
  const [loadingUnidades, setLoadingUnidades] = useState(true);

  const [erro, setErro] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    let ativo = true;
    api.listUnidades()
      .then((data) => {
        if (ativo) {
          setUnidades((data.results || data).sort((a, b) => a.nome.localeCompare(b.nome)));
          setLoadingUnidades(false);
        }
      })
      .catch((err) => {
        if (ativo) {
          setErro("Não foi possível carregar as unidades.");
          setLoadingUnidades(false);
        }
      });
    return () => { ativo = false; };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setFieldErrors({});

    if (senha !== confirmacao) {
      setErro("As senhas não coincidem.");
      return;
    }

    setEnviando(true);
    try {
      await api.solicitarAcesso({
        nome_completo: nome,
        email,
        unidade,
        senha,
        confirmacao_senha: confirmacao
      });
      setSucesso(true);
    } catch (err) {
      setErro(err.message || "Não foi possível enviar a solicitação.");
      setFieldErrors(err.fieldErrors || {});
    } finally {
      setEnviando(false);
    }
  }

  if (sucesso) {
    return (
      <main className="standalone-page">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="alert alert-success text-center mt-4 shadow-sm" role="alert">
              <h4 className="alert-heading mb-3"><i className="bi bi-check-circle me-2"></i>Sucesso!</h4>
              <p>
                Sua solicitação de acesso foi enviada com sucesso e aguarda aprovação pelo Administrador Master.
              </p>
              <p className="mb-0 text-muted">
                Assim que for aprovada, você poderá entrar no sistema utilizando seu <strong>e-mail institucional</strong> e a senha cadastrada.
              </p>
              <hr />
              <button className="btn btn-success mt-2" onClick={() => navigate("/login")}>
                Voltar para o Login
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="standalone-page">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <Card className="mt-4">
            <h1 className="h4 mb-3 text-center">
              <i className="bi bi-person-plus me-2"></i>Solicitar Acesso
            </h1>
            <p className="text-muted text-center mb-4">
              Preencha os dados institucionais para solicitar acesso. Após aprovação, seu login será realizado com seu e-mail institucional e senha cadastrada.
            </p>

            <ApiErrorMessage error={erro} fieldErrors={fieldErrors} title="Erro na solicitação" />

            <form onSubmit={handleSubmit}>
              <Input
                id="nome"
                label="Nome completo"
                placeholder="ex: João da Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                error={fieldErrors.nome_completo}
              />
              <Input
                id="email"
                type="email"
                label="E-mail institucional"
                placeholder="ex: joao.silva@ufpi.edu.br"
                hint="Este e-mail será o seu login principal de acesso à plataforma."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                error={fieldErrors.email}
              />

              <div className="mb-3">
                <label htmlFor="unidade" className="form-label">
                  Unidade da UFPI
                </label>
                <select
                  id="unidade"
                  className={`form-select ${fieldErrors.unidade ? 'is-invalid' : ''}`}
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value)}
                  required
                  disabled={loadingUnidades}
                >
                  <option value="">Selecione uma unidade...</option>
                  {unidades.map(u => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
                {fieldErrors.unidade && (
                  <div className="invalid-feedback">
                    {fieldErrors.unidade.join(" ")}
                  </div>
                )}
              </div>

              <Input
                id="senha"
                type="password"
                label="Senha"
                placeholder="Defina sua senha de acesso"
                hint="Senha que você utilizará para entrar no sistema junto com seu e-mail."
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                error={fieldErrors.senha}
              />
              <Input
                id="confirmacao"
                type="password"
                label="Confirmação de senha"
                placeholder="Repita a senha informada"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                required
                error={fieldErrors.confirmacao_senha}
              />

              <div className="d-flex justify-content-between mt-4">
                <button type="button" className="btn btn-outline-secondary" onClick={() => navigate("/login")}>
                  Cancelar
                </button>
                <Button type="submit" loading={enviando}>
                  {enviando ? "Enviando..." : "Solicitar"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
}

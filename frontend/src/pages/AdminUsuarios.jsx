import { useState, useEffect } from "react";
import { api, extractFieldErrors } from "../api/client";
import { Button, Card, LoadingState, Input } from "../components/ui";
import ApiErrorMessage from "../components/ApiErrorMessage";

export default function AdminUsuarios() {
  const [tab, setTab] = useState("solicitacoes");

  return (
    <div className="container-fluid py-4">
      <h1 className="h3 mb-4">Gestão de Usuários</h1>

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "solicitacoes" ? "active" : ""}`}
            onClick={() => setTab("solicitacoes")}
          >
            Solicitações de Acesso
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "usuarios" ? "active" : ""}`}
            onClick={() => setTab("usuarios")}
          >
            Usuários Cadastrados
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "criar" ? "active" : ""}`}
            onClick={() => setTab("criar")}
          >
            Criar Usuário
          </button>
        </li>
      </ul>

      {tab === "solicitacoes" && <TabSolicitacoes />}
      {tab === "usuarios" && <TabUsuarios />}
      {tab === "criar" && <TabCriarUsuario onCreated={() => setTab("usuarios")} />}
    </div>
  );
}

function TabSolicitacoes() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("pendente");

  const [acaoId, setAcaoId] = useState(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState("");
  const [showRejeitar, setShowRejeitar] = useState(false);

  const carregar = () => {
    setLoading(true);
    api.listSolicitacoes({ status: statusFiltro })
      .then(data => setSolicitacoes(data.results || data))
      .catch(err => setErro(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregar();
  }, [statusFiltro]);

  const aprovar = async (id) => {
    if (!window.confirm("Confirmar aprovação?")) return;
    try {
      await api.aprovarSolicitacao(id);
      carregar();
    } catch (err) {
      alert("Erro ao aprovar: " + err.message);
    }
  };

  const confirmarRejeicao = async () => {
    try {
      await api.rejeitarSolicitacao(acaoId, { motivo_rejeicao: motivoRejeicao });
      setShowRejeitar(false);
      carregar();
    } catch (err) {
      alert("Erro ao rejeitar: " + err.message);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <div className="alert alert-info py-2 mb-3">
        <i className="bi bi-info-circle me-2"></i>
        Ao aprovar uma solicitação, a conta é ativada imediatamente e o usuário poderá fazer login utilizando seu <strong>e-mail institucional</strong> e a senha cadastrada.
      </div>

      <div className="mb-3">
        <label className="me-2" htmlFor="status-filtro">Filtrar por Status:</label>
        <select id="status-filtro" value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} className="form-select d-inline-block w-auto">
          <option value="pendente">Pendente</option>
          <option value="aprovado">Aprovado</option>
          <option value="rejeitado">Rejeitado</option>
        </select>
      </div>

      <ApiErrorMessage error={erro} />

      <div className="table-responsive">
        <table className="table table-bordered table-striped">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Unidade</th>
              <th>Data</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {solicitacoes.map(s => (
              <tr key={s.id}>
                <td>{s.nome_completo}</td>
                <td>{s.email}</td>
                <td>{s.unidade_nome}</td>
                <td>{new Date(s.data_solicitacao).toLocaleString()}</td>
                <td>
                  <span className={`badge bg-${s.status === 'pendente' ? 'warning' : s.status === 'aprovado' ? 'success' : 'danger'}`}>
                    {s.status}
                  </span>
                </td>
                <td>
                  {s.status === 'pendente' && (
                    <>
                      <button className="btn btn-sm btn-success me-2" onClick={() => aprovar(s.id)}>Aprovar</button>
                      <button className="btn btn-sm btn-danger" onClick={() => { setAcaoId(s.id); setMotivoRejeicao(""); setShowRejeitar(true); }}>Rejeitar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {solicitacoes.length === 0 && <tr><td colSpan="6" className="text-center">Nenhuma solicitação encontrada.</td></tr>}
          </tbody>
        </table>
      </div>

      {showRejeitar && (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Rejeitar Solicitação</h5>
                <button type="button" className="btn-close" onClick={() => setShowRejeitar(false)}></button>
              </div>
              <div className="modal-body">
                <Input
                  label="Motivo (opcional)"
                  value={motivoRejeicao}
                  onChange={e => setMotivoRejeicao(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRejeitar(false)}>Cancelar</button>
                <button type="button" className="btn btn-danger" onClick={confirmarRejeicao}>Confirmar Rejeição</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState("");
  const [filtroUnidade, setFiltroUnidade] = useState("");
  
  const [unidades, setUnidades] = useState([]);

  useEffect(() => {
    api.listUnidades().then(data => setUnidades((data.results || data).sort((a,b) => a.nome.localeCompare(b.nome)))).catch(() => {});
  }, []);

  const carregar = () => {
    setLoading(true);
    api.listUsuariosAdmin({ perfil: filtroPerfil, unidade: filtroUnidade })
      .then(data => setUsuarios(data.results || data))
      .catch(err => setErro(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregar();
  }, [filtroPerfil, filtroUnidade]);

  const toggleStatus = async (user) => {
    if (!window.confirm(`Deseja ${user.is_active ? 'desativar' : 'ativar'} o usuário ${user.email}?`)) return;
    try {
      await api.updateUsuarioStatus(user.id, { is_active: !user.is_active });
      carregar();
    } catch (err) {
      alert("Erro: " + err.message);
    }
  };

  const excluirConta = async (user) => {
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente o registro da conta de ${user.nome_completo || user.email}? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.deleteUsuarioAdmin(user.id);
      carregar();
    } catch (err) {
      alert("Erro ao excluir conta: " + err.message);
    }
  };

  if (loading && usuarios.length === 0) return <LoadingState />;

  return (
    <div>
      <div className="row mb-3">
        <div className="col-md-3">
          <select value={filtroPerfil} onChange={e => setFiltroPerfil(e.target.value)} className="form-select">
            <option value="">Todos os perfis</option>
            <option value="usuario">Usuário</option>
            <option value="admin">Administrador</option>
            <option value="admin_master">Admin Master</option>
          </select>
        </div>
        <div className="col-md-3">
          <select value={filtroUnidade} onChange={e => setFiltroUnidade(e.target.value)} className="form-select">
            <option value="">Todas as unidades</option>
            {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>
      </div>

      <ApiErrorMessage error={erro} />

      <div className="table-responsive">
        <table className="table table-bordered table-striped">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th>Unidade</th>
              <th>Grupos da unidade</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id}>
                <td>{u.nome_completo || u.username}</td>
                <td>{u.email}</td>
                <td><span className="badge bg-secondary">{u.perfil}</span></td>
                <td>{u.unidade_nome}</td>
                <td>{u.grupos_nomes ? u.grupos_nomes.join(', ') : '-'}</td>
                <td>
                  <span className={`badge bg-${u.is_active ? 'success' : 'danger'}`}>
                    {u.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td>
                  <div className="d-flex gap-2">
                    <button 
                      className={`btn btn-sm btn-${u.is_active ? 'danger' : 'success'}`} 
                      onClick={() => toggleStatus(u)}
                    >
                      {u.is_active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => excluirConta(u)}
                      title="Excluir permanentemente o registro da conta"
                    >
                      <i className="bi bi-trash me-1"></i>Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && <tr><td colSpan="7" className="text-center">Nenhum usuário encontrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabCriarUsuario({ onCreated }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState("usuario");
  const [unidade, setUnidade] = useState("");
  const [senha, setSenha] = useState("");

  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    api.listUnidades().then(data => setUnidades((data.results || data).sort((a,b) => a.nome.localeCompare(b.nome)))).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setFieldErrors({});
    setLoading(true);

    try {
      await api.createUsuarioAdmin({
        nome_completo: nome,
        email,
        perfil,
        unidade: unidade || null,
        senha,
      });
      alert("Usuário criado com sucesso!");
      onCreated();
    } catch (err) {
      setErro(err.message);
      setFieldErrors(err.fieldErrors || {});
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4" style={{ maxWidth: '600px' }}>
      <div className="alert alert-info py-2 mb-3">
        <i className="bi bi-info-circle me-2"></i>
        O novo usuário poderá acessar a plataforma informando seu <strong>e-mail institucional</strong> (ou nome de usuário) e a senha temporária definida abaixo.
      </div>
      <ApiErrorMessage error={erro} fieldErrors={fieldErrors} />
      <form onSubmit={handleSubmit}>
        <Input label="Nome Completo" placeholder="ex: Maria de Lourdes" value={nome} onChange={e => setNome(e.target.value)} required error={fieldErrors.nome_completo} />
        <Input label="E-mail" type="email" placeholder="ex: maria.lourdes@ufpi.edu.br" hint="O e-mail será o identificador principal de login do usuário." value={email} onChange={e => setEmail(e.target.value)} required error={fieldErrors.email} />
        
        <div className="mb-3">
          <label className="form-label" htmlFor="perfil">Perfil</label>
          <select id="perfil" className={`form-select ${fieldErrors.perfil ? 'is-invalid' : ''}`} value={perfil} onChange={e => setPerfil(e.target.value)} required>
            <option value="usuario">Usuário</option>
            <option value="admin">Administrador</option>
            <option value="admin_master">Admin Master</option>
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="unidade">Unidade</label>
          <select id="unidade" className={`form-select ${fieldErrors.unidade ? 'is-invalid' : ''}`} value={unidade} onChange={e => setUnidade(e.target.value)}>
            <option value="">Selecione...</option>
            {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>

        {perfil === 'admin' && (
          <p className="text-muted small">
            O escopo administrativo será herdado dos grupos de contratação administrados pela unidade selecionada.
          </p>
        )}

        {perfil === 'admin_master' && (
          <p className="text-muted small">
            Contas Admin Master recebem escopo administrativo global.
          </p>
        )}

        <Input label="Senha Temporária" type="password" placeholder="Senha inicial de acesso" hint="O usuário utilizará esta senha junto com o e-mail no primeiro login." value={senha} onChange={e => setSenha(e.target.value)} required error={fieldErrors.senha} />

        <Button type="submit" loading={loading}>Salvar Usuário</Button>
      </form>
    </Card>
  );
}

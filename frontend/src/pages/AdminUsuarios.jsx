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
  const [solicitacaoAprovar, setSolicitacaoAprovar] = useState(null);
  const [perfilAprovacao, setPerfilAprovacao] = useState("usuario");
  const [grupoAprovacao, setGrupoAprovacao] = useState("");
  const [grupos, setGrupos] = useState([]);
  const [carregandoGrupos, setCarregandoGrupos] = useState(false);
  const [erroAprovacao, setErroAprovacao] = useState("");
  const [aprovando, setAprovando] = useState(false);

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

  const abrirAprovacao = (solicitacao) => {
    setSolicitacaoAprovar(solicitacao);
    setPerfilAprovacao("usuario");
    setGrupoAprovacao("");
    setGrupos([]);
    setErroAprovacao("");
    setCarregandoGrupos(true);
    api.listGrupos({ ativo: true })
      .then(data => {
        const lista = data?.results || data || [];
        setGrupos(lista.filter(grupo => grupo.ativo !== false));
      })
      .catch(err => setErroAprovacao(err.message))
      .finally(() => setCarregandoGrupos(false));
  };

  const fecharAprovacao = () => {
    if (aprovando) return;
    setSolicitacaoAprovar(null);
    setErroAprovacao("");
  };

  const confirmarAprovacao = async () => {
    if (!solicitacaoAprovar) return;
    if (perfilAprovacao === "admin" && !grupoAprovacao) {
      setErroAprovacao("Selecione o grupo de contratação do administrador.");
      return;
    }

    const payload = {
      perfil: perfilAprovacao,
      grupos_administrados: perfilAprovacao === "admin" ? [Number(grupoAprovacao)] : [],
    };
    setAprovando(true);
    try {
      await api.aprovarSolicitacao(solicitacaoAprovar.id, payload);
      setSolicitacaoAprovar(null);
      carregar();
    } catch (err) {
      setErroAprovacao("Erro ao aprovar: " + err.message);
    } finally {
      setAprovando(false);
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
                      <button className="btn btn-sm btn-success me-2" onClick={() => abrirAprovacao(s)}>Aprovar</button>
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

      {solicitacaoAprovar && (
        <div
          className="modal"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="aprovar-solicitacao-titulo"
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title h5" id="aprovar-solicitacao-titulo">Definir acesso do usuário</h2>
                <button type="button" className="btn-close" onClick={fecharAprovacao} disabled={aprovando} aria-label="Fechar"></button>
              </div>
              <div className="modal-body">
                <p>
                  Escolha a permissão para <strong>{solicitacaoAprovar.nome_completo}</strong> antes de aprovar a solicitação.
                </p>

                <div className="mb-3">
                  <label className="form-label" htmlFor="perfil-aprovacao">Permissão / perfil</label>
                  <select
                    id="perfil-aprovacao"
                    className="form-select"
                    value={perfilAprovacao}
                    onChange={event => {
                      setPerfilAprovacao(event.target.value);
                      setGrupoAprovacao("");
                      setErroAprovacao("");
                    }}
                    disabled={aprovando}
                  >
                    <option value="usuario">Usuário</option>
                    <option value="admin">Administrador de grupo</option>
                    <option value="admin_master">Admin Master</option>
                  </select>
                </div>

                {perfilAprovacao === "admin" && (
                  <div className="mb-3">
                    <label className="form-label" htmlFor="grupo-aprovacao">Grupo de contratação</label>
                    <select
                      id="grupo-aprovacao"
                      className="form-select"
                      value={grupoAprovacao}
                      onChange={event => {
                        setGrupoAprovacao(event.target.value);
                        setErroAprovacao("");
                      }}
                      disabled={carregandoGrupos || aprovando}
                      required
                    >
                      <option value="">
                        {carregandoGrupos ? "Carregando grupos..." : "Selecione o grupo..."}
                      </option>
                      {grupos.map(grupo => (
                        <option key={grupo.id} value={grupo.id}>
                          {grupo.nome}{grupo.unidade_admin_sigla ? ` (${grupo.unidade_admin_sigla})` : ""}
                        </option>
                      ))}
                    </select>
                    {!carregandoGrupos && grupos.length === 0 && (
                      <div className="form-text text-danger">Nenhum grupo de contratação ativo foi encontrado.</div>
                    )}
                  </div>
                )}

                {perfilAprovacao === "admin_master" && (
                  <div className="alert alert-info py-2">
                    O Admin Master terá permissão administrativa global e não precisa de grupo.
                  </div>
                )}

                {erroAprovacao && <div className="alert alert-danger" role="alert">{erroAprovacao}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={fecharAprovacao} disabled={aprovando}>Cancelar</button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={confirmarAprovacao}
                  disabled={aprovando || carregandoGrupos || (perfilAprovacao === "admin" && grupos.length === 0)}
                >
                  {aprovando ? "Aprovando..." : "Confirmar aprovação"}
                </button>
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
  const [gruposSelecionados, setGruposSelecionados] = useState([]);

  const [unidades, setUnidades] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    api.listUnidades().then(data => setUnidades((data.results || data).sort((a,b) => a.nome.localeCompare(b.nome)))).catch(() => {});
    api.listGrupos({ ativo: true }).then(data => setGrupos((data.results || data).filter(g => g.ativo !== false))).catch(() => {});
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
        grupos_administrados: perfil === "admin" ? gruposSelecionados.map(Number) : [],
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
          <fieldset className="mb-3">
            <legend className="form-label">Grupos administrados</legend>
            <p className="text-muted small">Selecione explicitamente um ou mais grupos de contratação.</p>
            {grupos.map(grupo => (
              <div className="form-check" key={grupo.id}>
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`grupo-criacao-${grupo.id}`}
                  checked={gruposSelecionados.includes(String(grupo.id))}
                  onChange={event => setGruposSelecionados(atuais => event.target.checked
                    ? [...atuais, String(grupo.id)]
                    : atuais.filter(id => id !== String(grupo.id)))}
                />
                <label className="form-check-label" htmlFor={`grupo-criacao-${grupo.id}`}>{grupo.nome}</label>
              </div>
            ))}
            {fieldErrors.grupos_administrados && (
              <div className="text-danger small">{fieldErrors.grupos_administrados}</div>
            )}
          </fieldset>
        )}

        {perfil === 'admin_master' && (
          <p className="text-muted small">
            Contas Admin Master recebem escopo administrativo global.
          </p>
        )}

        <Input label="Senha Temporária" type="password" placeholder="Senha inicial de acesso" hint="O usuário utilizará esta senha junto com o e-mail no primeiro login." value={senha} onChange={e => setSenha(e.target.value)} required error={fieldErrors.senha} />

        <Button type="submit" loading={loading} disabled={perfil === "admin" && gruposSelecionados.length === 0}>Salvar Usuário</Button>
      </form>
    </Card>
  );
}

import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import ApiErrorMessage, { InlineMessage } from "../components/ApiErrorMessage";
import CatalogoFormModal from "../components/CatalogoFormModal";
import PageHeader from "../components/PageHeader";
import { Badge, Button, Card, EmptyState, Input, LoadingState, Modal, Select, Table } from "../components/ui";
import useDebouncedValue from "../hooks/useDebouncedValue";
import { formatCurrency } from "../utils/format";

const SEARCH_DELAY = 350;

function resultsFrom(data) {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.results) ? data.results : [];
}

function paginationFrom(data) {
  if (!data || Array.isArray(data) || typeof data !== "object") return null;
  if (!("count" in data || "next" in data || "previous" in data)) return null;
  return {
    count: typeof data.count === "number" ? data.count : null,
    hasNext: Boolean(data.next),
    hasPrevious: Boolean(data.previous),
  };
}

export default function Catalogo() {
  const { user, isAdmin, isAdminMaster } = useAuth();
  const [itens, setItens] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [busca, setBusca] = useState("");
  const [grupo, setGrupo] = useState("");
  const [ativo, setAtivo] = useState("");
  const [pagina, setPagina] = useState(1);
  const [paginacao, setPaginacao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [tentativa, setTentativa] = useState(0);
  const [formAberto, setFormAberto] = useState(false);
  const [itemEditando, setItemEditando] = useState(null);
  const [itemParaDesativar, setItemParaDesativar] = useState(null);
  const [erroMutacao, setErroMutacao] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const buscaDebounced = useDebouncedValue(busca, SEARCH_DELAY);
  const gruposAdministrados = Array.isArray(user?.grupos_administrados)
    ? user.grupos_administrados
    : [];
  const gruposAdministradosIds = new Set(
    gruposAdministrados.map((item) => Number(item.id))
  );
  const gruposGerenciaveis = isAdminMaster
    ? grupos
    : grupos.filter((item) => gruposAdministradosIds.has(Number(item.id)));

  useEffect(() => {
    let mounted = true;
    api.listGrupos({ ativo: true })
      .then((data) => mounted && setGrupos(resultsFrom(data).filter((item) => item.ativo !== false)))
      .catch(() => mounted && setGrupos([]));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const query = {
      q: buscaDebounced.trim() || undefined,
      grupo: grupo || undefined,
      ativo: isAdmin && ativo !== "" ? ativo : undefined,
      page: pagina > 1 ? pagina : undefined,
    };
    setCarregando(true);
    setErro(null);
    api.listCatalogo(query, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setItens(resultsFrom(data));
        setPaginacao(paginationFrom(data));
      })
      .catch((error) => {
        if (controller.signal.aborted || error?.code === "REQUEST_ABORTED") return;
        setItens([]);
        setPaginacao(null);
        setErro(error);
      })
      .finally(() => !controller.signal.aborted && setCarregando(false));
    return () => controller.abort();
  }, [ativo, buscaDebounced, grupo, isAdmin, pagina, tentativa]);

  const itensVisiveis = isAdmin ? itens : itens.filter((item) => item.ativo !== false);
  const filtrosAplicados = Boolean(buscaDebounced.trim() || grupo || (isAdmin && ativo !== ""));

  function podeGerenciarItem(item) {
    if (isAdminMaster) return true;
    return gruposAdministradosIds.has(Number(item.grupo));
  }

  function limparFiltros() {
    setBusca("");
    setGrupo("");
    setAtivo("");
    setPagina(1);
  }

  function updateFilter(setter) {
    return (event) => {
      setter(event.target.value);
      setPagina(1);
    };
  }

  function abrirCadastro() {
    setItemEditando(null);
    setErroMutacao(null);
    setFormAberto(true);
  }

  function abrirEdicao(item) {
    setItemEditando(item);
    setErroMutacao(null);
    setFormAberto(true);
  }

  async function salvarItem(payload) {
    setSalvando(true);
    setErroMutacao(null);
    try {
      const salvo = itemEditando
        ? await api.updateCatalogoItem(itemEditando.id, payload)
        : await api.createCatalogoItem(payload);
      setItens((atuais) => itemEditando
        ? atuais.map((item) => item.id === salvo.id ? salvo : item)
        : [salvo, ...atuais]);
      setMensagem(itemEditando ? "Item atualizado com sucesso." : "Item cadastrado com sucesso.");
      setFormAberto(false);
      setItemEditando(null);
    } catch (error) {
      setErroMutacao(error);
    } finally {
      setSalvando(false);
    }
  }

  async function alterarSituacao(item, ativar) {
    if (!item) return;
    setSalvando(true);
    setErroMutacao(null);
    try {
      const atualizado = ativar
        ? await api.ativarCatalogoItem(item.id)
        : await api.desativarCatalogoItem(item.id);
      setItens((atuais) => atuais.map((atual) => atual.id === atualizado.id ? atualizado : atual));
      setMensagem(ativar ? "Item ativado com sucesso." : "Item desativado com sucesso.");
      setItemParaDesativar(null);
    } catch (error) {
      setErroMutacao(error);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Planejamento e contratações"
        title="Catálogo de itens"
        description="Consulte materiais e serviços por nome, código ou grupo de contratação."
        actions={isAdmin && gruposGerenciaveis.length > 0 && (
          <Button onClick={abrirCadastro}>
            <i className="bi bi-plus-lg" aria-hidden="true" />Cadastrar item
          </Button>
        )}
      />

      {mensagem && <InlineMessage variant="success" onDismiss={() => setMensagem("")}>{mensagem}</InlineMessage>}

      <Card
        title="Buscar no catálogo"
        className="mb-4"
        actions={filtrosAplicados && (
          <Button variant="ghost" size="sm" onClick={limparFiltros}>
            <i className="bi bi-x-circle" aria-hidden="true" />
            Limpar filtros
          </Button>
        )}
      >
        <div className={`catalogo-filtros${isAdmin ? " catalogo-filtros--admin" : ""}`}>
          <Input id="catalogo-busca" label="Pesquisar por nome ou código" type="search" value={busca} onChange={updateFilter(setBusca)} placeholder="Ex.: computador ou CATMAT 451406" />
          <Select id="catalogo-grupo" label="Grupo" value={grupo} onChange={updateFilter(setGrupo)}>
            <option value="">Todos os grupos</option>
            {grupos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </Select>
          {isAdmin && (
            <Select id="catalogo-ativo" label="Situação" value={ativo} onChange={updateFilter(setAtivo)}>
              <option value="">Todos</option><option value="true">Ativos</option><option value="false">Inativos</option>
            </Select>
          )}
        </div>
      </Card>

      {erro ? (
        <ApiErrorMessage error={erro} title="Não foi possível carregar o catálogo" onRetry={() => setTentativa((value) => value + 1)} />
      ) : carregando ? (
        <LoadingState label="Carregando itens do catálogo..." />
      ) : itensVisiveis.length === 0 ? (
        <EmptyState icon="bi-search" title="Nenhum item encontrado" description={filtrosAplicados ? "Tente ajustar os termos ou filtros da pesquisa." : "Ainda não há itens disponíveis no catálogo."} />
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3" aria-live="polite">
            <strong>
              {paginacao?.count ?? itensVisiveis.length} {(paginacao?.count ?? itensVisiveis.length) === 1 ? "resultado" : "resultados"}
            </strong>
            {filtrosAplicados && (
              <Button variant="link" size="sm" onClick={limparFiltros}>
                Limpar filtros
              </Button>
            )}
          </div>
          <Table caption="Itens encontrados no catálogo">
            <thead><tr>
              <th scope="col">Código</th><th scope="col">Nome</th><th scope="col">Tipo</th><th scope="col">Grupo</th><th scope="col">Unidade</th><th scope="col">Valor estimado</th>
              {isAdmin && <th scope="col">Situação</th>}{isAdmin && <th scope="col" className="text-end">Ações</th>}
            </tr></thead>
            <tbody>{itensVisiveis.map((item) => (
              <tr key={item.id}>
                <td>{item.codigo_catmat_catser || "—"}</td><td>{item.nome}</td><td className="text-capitalize">{item.tipo}</td><td>{item.grupo_nome || "—"}</td><td>{item.unidade_medida}</td><td>{formatCurrency(item.valor_estimado)}</td>
                {isAdmin && <td><Badge variant={item.ativo === false ? "neutral" : "success"} icon={item.ativo === false ? "bi-slash-circle" : "bi-check-circle"}>{item.ativo === false ? "Inativo" : "Ativo"}</Badge></td>}
                {isAdmin && (
                  <td className="text-end">
                    {podeGerenciarItem(item) ? (
                      <div className="d-inline-flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => abrirEdicao(item)}><i className="bi bi-pencil" aria-hidden="true" />Editar</Button>
                        <Button variant={item.ativo === false ? "success" : "danger"} size="sm" onClick={() => item.ativo === false ? alterarSituacao(item, true) : setItemParaDesativar(item)}>{item.ativo === false ? "Ativar" : "Desativar"}</Button>
                      </div>
                    ) : (
                      <span className="text-muted small">
                        Escopo de leitura
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}</tbody>
          </Table>
          {paginacao && (
            <nav className="catalogo-paginacao" aria-label="Paginação do catálogo">
              <span className="text-muted">{paginacao.count === null ? `Página ${pagina}` : `${paginacao.count} ${paginacao.count === 1 ? "item" : "itens"} • Página ${pagina}`}</span>
              <div className="d-flex gap-2">
                <Button variant="secondary" size="sm" disabled={!paginacao.hasPrevious || carregando} onClick={() => setPagina((value) => Math.max(1, value - 1))}><i className="bi bi-chevron-left" aria-hidden="true" />Anterior</Button>
                <Button variant="secondary" size="sm" disabled={!paginacao.hasNext || carregando} onClick={() => setPagina((value) => value + 1)}>Próxima<i className="bi bi-chevron-right" aria-hidden="true" /></Button>
              </div>
            </nav>
          )}
        </>
      )}

      {isAdmin && <CatalogoFormModal open={formAberto} item={itemEditando} grupos={gruposGerenciaveis} busy={salvando} requestError={erroMutacao} onClose={() => { setFormAberto(false); setErroMutacao(null); }} onSubmit={salvarItem} />}
      <Modal
        open={Boolean(isAdmin && itemParaDesativar)}
        title="Desativar item do catálogo"
        onClose={() => !salvando && setItemParaDesativar(null)}
        footer={<><Button variant="secondary" onClick={() => setItemParaDesativar(null)} disabled={salvando}>Cancelar</Button><Button variant="danger" loading={salvando} onClick={() => alterarSituacao(itemParaDesativar, false)}>Confirmar desativação</Button></>}
      >
        <p className="mb-0">O item <strong>{itemParaDesativar?.nome}</strong> deixará de aparecer para usuários comuns.</p>
      </Modal>
    </div>
  );
}

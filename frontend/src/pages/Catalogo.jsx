import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import ApiErrorMessage from "../components/ApiErrorMessage";
import PageHeader from "../components/PageHeader";
import { Badge, Button, Card, EmptyState, Input, LoadingState, Select, Table } from "../components/ui";
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
  const { isAdmin } = useAuth();
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
  const buscaDebounced = useDebouncedValue(busca, SEARCH_DELAY);

  useEffect(() => {
    let montado = true;
    api.listGrupos({ ativo: true }).then((data) => {
      if (montado) setGrupos(resultsFrom(data).filter((item) => item.ativo !== false));
    }).catch(() => {
      if (montado) setGrupos([]);
    });
    return () => {
      montado = false;
    };
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
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });

    return () => controller.abort();
  }, [ativo, buscaDebounced, grupo, isAdmin, pagina, tentativa]);

  const itensVisiveis = isAdmin ? itens : itens.filter((item) => item.ativo !== false);
  const filtrosAplicados = Boolean(buscaDebounced.trim() || grupo || (isAdmin && ativo !== ""));

  function atualizarBusca(event) {
    setBusca(event.target.value);
    setPagina(1);
  }

  function atualizarGrupo(event) {
    setGrupo(event.target.value);
    setPagina(1);
  }

  function atualizarAtivo(event) {
    setAtivo(event.target.value);
    setPagina(1);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Planejamento e contratações"
        title="Catálogo de itens"
        description="Consulte materiais e serviços por nome, código ou grupo de contratação."
      />

      <Card title="Filtros" className="mb-4">
        <div className={`catalogo-filtros${isAdmin ? " catalogo-filtros--admin" : ""}`}>
          <Input
            id="catalogo-busca"
            label="Pesquisar por nome ou código"
            type="search"
            value={busca}
            onChange={atualizarBusca}
            placeholder="Ex.: computador ou CATMAT 451406"
          />
          <Select id="catalogo-grupo" label="Grupo" value={grupo} onChange={atualizarGrupo}>
            <option value="">Todos os grupos</option>
            {grupos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </Select>
          {isAdmin && (
            <Select id="catalogo-ativo" label="Situação" value={ativo} onChange={atualizarAtivo}>
              <option value="">Todos</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </Select>
          )}
        </div>
      </Card>

      {erro ? (
        <ApiErrorMessage
          error={erro}
          title="Não foi possível carregar o catálogo"
          onRetry={() => setTentativa((valor) => valor + 1)}
        />
      ) : carregando ? (
        <LoadingState label="Carregando itens do catálogo..." />
      ) : itensVisiveis.length === 0 ? (
        <EmptyState
          icon="bi-search"
          title="Nenhum item encontrado"
          description={filtrosAplicados
            ? "Tente ajustar os termos ou filtros da pesquisa."
            : "Ainda não há itens disponíveis no catálogo."}
        />
      ) : (
        <>
          <Table caption="Itens encontrados no catálogo">
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Nome</th>
                <th scope="col">Tipo</th>
                <th scope="col">Grupo</th>
                <th scope="col">Unidade</th>
                <th scope="col">Valor estimado</th>
                {isAdmin && <th scope="col">Situação</th>}
              </tr>
            </thead>
            <tbody>
              {itensVisiveis.map((item) => (
                <tr key={item.id}>
                  <td>{item.codigo_catmat_catser || "—"}</td>
                  <td>{item.nome}</td>
                  <td className="text-capitalize">{item.tipo}</td>
                  <td>{item.grupo_nome || "—"}</td>
                  <td>{item.unidade_medida}</td>
                  <td>{formatCurrency(item.valor_estimado)}</td>
                  {isAdmin && (
                    <td>
                      <Badge
                        variant={item.ativo === false ? "neutral" : "success"}
                        icon={item.ativo === false ? "bi-slash-circle" : "bi-check-circle"}
                      >
                        {item.ativo === false ? "Inativo" : "Ativo"}
                      </Badge>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>

          {paginacao && (
            <nav className="catalogo-paginacao" aria-label="Paginação do catálogo">
              <span className="text-muted">
                {paginacao.count === null
                  ? `Página ${pagina}`
                  : `${paginacao.count} ${paginacao.count === 1 ? "item" : "itens"} • Página ${pagina}`}
              </span>
              <div className="d-flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!paginacao.hasPrevious || carregando}
                  onClick={() => setPagina((valor) => Math.max(1, valor - 1))}
                >
                  <i className="bi bi-chevron-left" aria-hidden="true" />Anterior
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!paginacao.hasNext || carregando}
                  onClick={() => setPagina((valor) => valor + 1)}
                >
                  Próxima<i className="bi bi-chevron-right" aria-hidden="true" />
                </Button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

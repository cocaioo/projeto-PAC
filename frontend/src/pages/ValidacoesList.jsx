import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import ApiErrorMessage from "../components/ApiErrorMessage";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { Card, EmptyState, LoadingState, ProgressSummary, Select } from "../components/ui";

export function resultadosDaApi(data) {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.results) ? data.results : [];
}

export function agruparItensPorDemanda(itens) {
  const demandas = new Map();

  itens.forEach((item) => {
    const dados = item.demanda_dados || {};
    const demandaId = dados.id ?? item.demanda_id ?? item.demanda;
    if (demandaId === undefined || demandaId === null) return;

    if (!demandas.has(demandaId)) {
      demandas.set(demandaId, {
        id: demandaId,
        anoReferencia: dados.ano_referencia ?? item.demanda_ano_referencia,
        status: dados.status ?? item.demanda_status ?? "aguardando_validacao",
        observacao: dados.observacao ?? item.demanda_observacao ?? "",
        enviadaEm: dados.enviada_em ?? item.demanda_enviada_em,
        unidade: dados.unidade || {
          id: item.unidade_id ?? item.unidade,
          nome: item.unidade_nome,
          sigla: item.unidade_sigla,
        },
        usuario: dados.usuario || {
          id: item.usuario_id ?? item.usuario,
          nome: item.usuario_nome,
          username: item.usuario_username,
        },
        itens: [],
      });
    }

    demandas.get(demandaId).itens.push(item);
  });

  return Array.from(demandas.values());
}

function formatarData(data) {
  if (!data) return "Não informada";
  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return "Não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(valor);
}

function nomesDosGrupos(itens) {
  const nomes = itens.map((item) => item.grupo_nome).filter(Boolean);
  return [...new Set(nomes)];
}

export default function ValidacoesList() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [itens, setItens] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [unidade, setUnidade] = useState("");
  const [grupo, setGrupo] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    // Bug #4: aguardar o AuthContext terminar antes de verificar isAdmin.
    if (authLoading || !isAdmin) return undefined;

    let ativo = true;
    Promise.allSettled([
      api.listUnidades({ ativo: true }),
      api.listGrupos({ ativo: true }),
    ]).then(([resultadoUnidades, resultadoGrupos]) => {
      if (!ativo) return;
      if (resultadoUnidades.status === "fulfilled") {
        setUnidades(resultadosDaApi(resultadoUnidades.value).filter((item) => item.ativo !== false));
      }
      if (resultadoGrupos.status === "fulfilled") {
        setGrupos(resultadosDaApi(resultadoGrupos.value).filter((item) => item.ativo !== false));
      }
    });

    return () => {
      ativo = false;
    };
  }, [authLoading, isAdmin]);

  useEffect(() => {
    // Bug #4: aguardar o AuthContext terminar antes de verificar isAdmin.
    if (authLoading) return undefined;

    if (!isAdmin) {
      setCarregando(false);
      return undefined;
    }

    let ativo = true;
    setCarregando(true);
    setErro(null);
    api
      .listPendentes({
        unidade: unidade || undefined,
        grupo: grupo || undefined,
      })
      .then((data) => {
        if (ativo) setItens(resultadosDaApi(data));
      })
      .catch((error) => {
        if (!ativo) return;
        setItens([]);
        setErro(error);
      })
      .finally(() => ativo && setCarregando(false));

    return () => {
      ativo = false;
    };
  }, [authLoading, grupo, isAdmin, tentativa, unidade]);

  const demandas = useMemo(() => agruparItensPorDemanda(itens), [itens]);
  const gruposEnvolvidos = useMemo(() => new Set(itens.map((item) => item.grupo_nome).filter(Boolean)).size, [itens]);

  if (!isAdmin) {
    return (
      <div>
        <PageHeader
          eyebrow="Administração"
          title="Validações"
          description="Análise das demandas recebidas por grupo de contratação."
        />
        <EmptyState
          icon="bi-shield-lock"
          title="Acesso restrito"
          description="Somente administradores podem analisar itens de demandas."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Administração"
        title="Demandas recebidas"
        description="Abra uma demanda para validar ou devolver cada item individualmente."
      />

      {!carregando && !erro && (
        <ProgressSummary
          items={[
            { label: "Demandas aguardando validação", value: demandas.length },
            { label: "Itens aguardando análise", value: itens.length },
            { label: "Grupos envolvidos", value: gruposEnvolvidos || "-" },
          ]}
        />
      )}

      <Card title="Filtros" className="mb-4">
        <div className="row g-3">
          <div className="col-md-6">
            <Select
              id="filtro-unidade-validacao"
              label="Unidade solicitante"
              value={unidade}
              onChange={(event) => setUnidade(event.target.value)}
            >
              <option value="">Todas as unidades</option>
              {unidades.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sigla ? `${item.sigla} — ` : ""}{item.nome}
                </option>
              ))}
            </Select>
          </div>
          <div className="col-md-6">
            <Select
              id="filtro-grupo-validacao"
              label="Grupo de contratação"
              value={grupo}
              onChange={(event) => setGrupo(event.target.value)}
            >
              <option value="">Todos os grupos</option>
              {grupos.map((item) => (
                <option key={item.id} value={item.id}>{item.nome}</option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {erro && (
        <ApiErrorMessage
          error={erro}
          title="Não foi possível carregar as demandas"
          onRetry={() => setTentativa((valor) => valor + 1)}
        />
      )}

      {carregando ? (
        <LoadingState label="Carregando demandas para validação..." />
      ) : !erro && demandas.length === 0 ? (
        <EmptyState
          icon="bi-check2-circle"
          title="Nenhuma demanda pendente de validação"
          description="Não há itens aguardando decisão para os filtros selecionados."
        />
      ) : (
        <div aria-label="Demandas aguardando validação">
          {demandas.map((demanda) => {
            const gruposDaDemanda = nomesDosGrupos(demanda.itens);
            return (
              <Card
                key={demanda.id}
                className="mb-3"
                title={`Demanda #${demanda.id}`}
                actions={<StatusBadge status={demanda.status} />}
                footer={(
                  <div className="d-flex justify-content-end">
                    <Link
                      to={`/validacoes/${demanda.id}`}
                      className="pac-button pac-button--primary"
                      aria-label={`Abrir demanda ${demanda.id}`}
                    >
                      <i className="bi bi-folder2-open" aria-hidden="true" />
                      Abrir demanda
                    </Link>
                  </div>
                )}
              >
                <div className="row g-3">
                  <div className="col-sm-6 col-lg-3">
                    <div className="text-muted small">Solicitante</div>
                    <div className="fw-semibold">{demanda.usuario?.nome || demanda.usuario?.username || "Não informado"}</div>
                  </div>
                  <div className="col-sm-6 col-lg-3">
                    <div className="text-muted small">Unidade</div>
                    <div className="fw-semibold">
                      {demanda.unidade?.sigla || demanda.unidade?.nome || "Não informada"}
                    </div>
                  </div>
                  <div className="col-sm-6 col-lg-3">
                    <div className="text-muted small">Referência</div>
                    <div className="fw-semibold">{demanda.anoReferencia || "Não informada"}</div>
                  </div>
                  <div className="col-sm-6 col-lg-3">
                    <div className="text-muted small">Enviada em</div>
                    <div className="fw-semibold">{formatarData(demanda.enviadaEm)}</div>
                  </div>
                </div>
                <div className="d-flex flex-wrap gap-3 mt-3 small">
                  <span>
                    <i className="bi bi-list-check me-1" aria-hidden="true" />
                    {demanda.itens.length} {demanda.itens.length === 1 ? "item pendente" : "itens pendentes"}
                  </span>
                  <span>
                    <i className="bi bi-collection me-1" aria-hidden="true" />
                    {gruposDaDemanda.length > 0 ? gruposDaDemanda.join(", ") : "Item manual"}
                  </span>
                </div>
                {demanda.observacao && <p className="text-muted mb-0 mt-3">{demanda.observacao}</p>}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import ApiErrorMessage, { InlineMessage } from "../components/ApiErrorMessage";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import {
  ActionBar,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  LoadingState,
  NextAction,
  ProgressSummary,
  Table,
  TaskChecklist,
} from "../components/ui";
import { formatCurrency } from "../utils/format";
import { getDemandNextAction, getItemNextAction } from "../utils/nextActions";
import { getStatusConfig } from "../utils/statusConfig";

const CLOSED_DEMAND_STATUSES = new Set(["concluida", "cancelada"]);

function asText(value) {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return asText(value);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getReturnReason(item) {
  return asText(item.ultima_devolucao?.comentario).trim()
    || asText(item.justificativa_devolucao).trim();
}

function getResponsibleName(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return asText(value.nome || value.nome_completo || value.username);
}

function getDfdNumber(item) {
  return asText(item.dfd?.numero || item.numero_dfd || item.dfd_numero).trim();
}

function canEditDemand(demanda) {
  return demanda.status === "rascunho";
}

function canEditItem(demanda, item) {
  if (CLOSED_DEMAND_STATUSES.has(demanda.status)) return false;
  return item.status === "rascunho" || item.status === "devolvida";
}

function canResubmitItem(demanda, item) {
  return !CLOSED_DEMAND_STATUSES.has(demanda.status) && item.status === "devolvida";
}

function historyTitle(event) {
  const explicit = asText(
    event.titulo
    || event.descricao
    || event.acao_display
    || event.status_display
  ).trim();
  if (explicit) return explicit;

  const status = asText(event.status).trim();
  if (status) return `Status: ${getStatusConfig(status).label}`;

  const action = asText(event.acao).trim();
  if (action === "devolvido" || action === "devolvida") return "Item devolvido";
  if (action === "validado" || action === "validada") return "Item validado";
  return action || "Atualização registrada";
}

function buildHistory(demanda, itens) {
  if (Array.isArray(demanda.historico) && demanda.historico.length > 0) {
    return demanda.historico.map((event, index) => ({
      id: event.id ?? `historico-${index}`,
      title: historyTitle(event),
      date: event.criado_em || event.ocorrido_em || event.data || event.atualizado_em,
      detail: asText(event.comentario || event.detalhe || event.motivo).trim(),
      responsible: getResponsibleName(
        event.responsavel || event.usuario || event.usuario_nome || event.responsavel_nome
      ),
    }));
  }

  const history = [];
  if (demanda.criado_em) {
    history.push({ id: "criada", title: "Demanda criada", date: demanda.criado_em });
  }
  if (demanda.enviada_em) {
    history.push({ id: "enviada", title: "Enviada para validação", date: demanda.enviada_em });
  }
  itens.forEach((item) => {
    if (!item.ultima_devolucao) return;
    history.push({
      id: `devolucao-${item.ultima_devolucao.id ?? item.id}`,
      title: `Item “${item.nome}” devolvido`,
      date: item.ultima_devolucao.criado_em,
      responsible: getResponsibleName(item.ultima_devolucao.responsavel),
    });
  });
  if (demanda.atualizado_em) {
    history.push({
      id: "atualizada",
      title: "Última atualização da demanda",
      date: demanda.atualizado_em,
    });
  }

  return history;
}

export default function DemandaDetail() {
  const { id } = useParams();
  const [demanda, setDemanda] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState(null);
  const [erroAcao, setErroAcao] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [reenviandoId, setReenviandoId] = useState(null);
  const [confirmacao, setConfirmacao] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroCarregamento(null);
    try {
      const data = await api.getDemanda(id);
      setDemanda(data);
      return data;
    } catch (error) {
      setDemanda(null);
      setErroCarregamento(error);
      return null;
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleEnviar() {
    setErroAcao(null);
    setMensagem("");
    setEnviando(true);
    try {
      const atualizada = await api.enviarDemanda(id);
      setDemanda(atualizada);
      setMensagem("Demanda enviada para validação.");
    } catch (error) {
      setErroAcao(error);
    } finally {
      setEnviando(false);
      setConfirmacao(null);
    }
  }

  async function handleReenviarItem(itemId) {
    setErroAcao(null);
    setMensagem("");
    setReenviandoId(itemId);
    try {
      const response = await api.reenviarItem(itemId);
      const atualizada = await carregar();
      if (atualizada) {
        setMensagem(response.detail || "Item reenviado para validação com sucesso.");
      }
    } catch (error) {
      setErroAcao(error);
    } finally {
      setReenviandoId(null);
      setConfirmacao(null);
    }
  }

  const itens = Array.isArray(demanda?.itens) ? demanda.itens : [];
  const historico = demanda ? buildHistory(demanda, itens) : [];

  if (carregando && !demanda) {
    return <LoadingState label="Carregando detalhes da demanda..." />;
  }

  if (erroCarregamento && !demanda) {
    return (
      <ApiErrorMessage
        error={erroCarregamento}
        title="Não foi possível carregar a demanda"
        onRetry={carregar}
      />
    );
  }

  if (!demanda) return null;

  const isDraft = canEditDemand(demanda);
  const nextAction = getDemandNextAction(demanda);
  const checklistItems = [
    { label: "Adicione ao menos um item", done: itens.length > 0 },
    {
      label: "Revise quantidades e valores",
      done: itens.length > 0 && itens.every((item) => (
        Number(item.quantidade) > 0 && Number(item.valor_estimado) > 0
      )),
    },
    { label: "Envie a demanda para validação", done: demanda.status !== "rascunho" },
  ];

  const headerActions = (
    <>
      <Link to="/demandas" className="pac-button pac-button--secondary">
        <i className="bi bi-arrow-left me-1" aria-hidden="true" />
        Voltar para demandas
      </Link>
      <StatusBadge status={demanda.status} />
      {isDraft && (
        <Link
          to={`/demandas/${demanda.id}/editar`}
          className="pac-button pac-button--secondary"
        >
          <i className="bi bi-pencil" aria-hidden="true" />
          Editar demanda
        </Link>
      )}
    </>
  );

  return (
    <div>
      <PageHeader
        eyebrow="Minhas demandas"
        title={`Demanda #${demanda.id}`}
        description="Consulte o andamento individual dos itens e as providências disponíveis."
        actions={headerActions}
      />

      {mensagem && (
        <InlineMessage variant="success" title="Operação concluída">
          {mensagem}
        </InlineMessage>
      )}
      <ApiErrorMessage
        error={erroAcao}
        title="Não foi possível atualizar a demanda"
      />

      <ProgressSummary
        items={[
          { label: "Status", value: <StatusBadge status={demanda.status} /> },
          { label: "Itens", value: itens.length },
          { label: "Valor total", value: formatCurrency(demanda.valor_total) },
          { label: "Próxima ação", value: <NextAction action={nextAction} /> },
        ]}
      />

      {isDraft && (
        <div className="mb-4">
          <TaskChecklist items={checklistItems} />
        </div>
      )}

      <Card title="Dados da demanda" className="mb-4">
        <dl className="row mb-0">
          <dt className="col-sm-3">Unidade</dt>
          <dd className="col-sm-9">{demanda.unidade_sigla || "—"}</dd>
          <dt className="col-sm-3">Ano de referência</dt>
          <dd className="col-sm-9">{demanda.ano_referencia}</dd>
          <dt className="col-sm-3">Responsável</dt>
          <dd className="col-sm-9">{demanda.usuario_nome || "—"}</dd>
          {demanda.observacao && (
            <>
              <dt className="col-sm-3">Observação</dt>
              <dd className="col-sm-9 mb-0">{demanda.observacao}</dd>
            </>
          )}
        </dl>
      </Card>

      <Card
        title="Itens solicitados"
        className="mb-4"
        actions={isDraft ? (
          <Link
            to={`/demandas/${demanda.id}/itens/novo`}
            className="pac-button pac-button--secondary pac-button--sm"
          >
            <i className="bi bi-plus-lg" aria-hidden="true" />
            Adicionar item
          </Link>
        ) : null}
        footer={isDraft && itens.length > 0 ? (
          <ActionBar summary="Rascunho pronto para envio quando os itens estiverem revisados.">
            <Button
              variant="success"
              loading={enviando}
              onClick={() => setConfirmacao({ tipo: "enviar" })}
            >
              <i className="bi bi-send" aria-hidden="true" />
              {enviando ? "Enviando..." : "Enviar para validação"}
            </Button>
          </ActionBar>
        ) : null}
      >
        {itens.length === 0 ? (
          <EmptyState
            icon="bi-inbox"
            title="Nenhum item adicionado"
            description={isDraft
              ? "Adicione ao menos um item antes de enviar a demanda."
              : "Esta demanda não possui itens para acompanhamento."}
          />
        ) : (
          <Table caption={`Itens da demanda ${demanda.id}`}>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Qtd.</th>
                <th scope="col">Valor unit.</th>
                <th scope="col">Valor total</th>
                <th scope="col">Status</th>
                <th scope="col">Próxima ação</th>
                <th scope="col">DFD</th>
                <th scope="col" className="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => {
                const returnReason = getReturnReason(item);
                const returnResponsible = getResponsibleName(item.ultima_devolucao?.responsavel);
                const dfdNumber = getDfdNumber(item);
                const editable = canEditItem(demanda, item);
                const resubmittable = canResubmitItem(demanda, item);
                const itemNextAction = getItemNextAction(item, demanda);

                return (
                  <tr key={item.id}>
                    <td>
                      <div className="fw-semibold">{item.nome}</div>
                      {item.observacoes && (
                        <div className="text-muted small mt-1">
                          <strong>Observação:</strong> {item.observacoes}
                        </div>
                      )}
                      {item.status === "devolvida" && returnReason && (
                        <div
                          className="alert alert-warning py-2 px-3 mt-2 mb-0 small"
                          role="note"
                          aria-label={`Motivo da devolução do item ${item.nome}`}
                        >
                          <strong className="d-block">
                            <i className="bi bi-exclamation-triangle me-1" aria-hidden="true" />
                            Motivo da devolução
                          </strong>
                          <span>{returnReason}</span>
                          {returnResponsible && (
                            <span className="d-block text-muted mt-1">
                              Registrado por {returnResponsible}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>{item.quantidade}</td>
                    <td>{formatCurrency(item.valor_estimado)}</td>
                    <td>{formatCurrency(item.valor_total)}</td>
                    <td><StatusBadge status={item.status} /></td>
                    <td><NextAction action={itemNextAction} compact /></td>
                    <td>
                      {dfdNumber ? (
                        <span className="fw-semibold" aria-label={`DFD ${dfdNumber}`}>
                          {dfdNumber}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="text-end">
                      {(editable || resubmittable) && (
                        <div className="d-flex flex-wrap justify-content-end gap-2">
                          {editable && (
                            <Link
                              to={`/demandas/${demanda.id}/itens/${item.id}/editar`}
                              className="pac-button pac-button--secondary pac-button--sm"
                              aria-label={`Editar item ${item.nome}`}
                            >
                              <i className="bi bi-pencil" aria-hidden="true" />
                              Editar
                            </Link>
                          )}
                          {resubmittable && (
                            <Button
                              variant="success"
                              size="sm"
                              loading={reenviandoId === item.id}
                              onClick={() => setConfirmacao({ tipo: "reenviar", item })}
                              aria-label={`Reenviar item ${item.nome}`}
                            >
                              <i className="bi bi-send" aria-hidden="true" />
                              {reenviandoId === item.id ? "Reenviando..." : "Reenviar"}
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={3} className="text-end">Total</th>
                <th>{formatCurrency(demanda.valor_total)}</th>
                <th colSpan={4} />
              </tr>
            </tfoot>
          </Table>
        )}
      </Card>

      {historico.length > 0 && (
        <Card title="Histórico da demanda">
          <ol className="list-group list-group-flush" aria-label="Histórico da demanda">
            {historico.map((event) => (
              <li key={event.id} className="list-group-item px-0">
                <div className="d-flex flex-wrap justify-content-between gap-2">
                  <strong>{event.title}</strong>
                  {event.date && (
                    <time className="text-muted small" dateTime={asText(event.date)}>
                      {formatDateTime(event.date)}
                    </time>
                  )}
                </div>
                {event.detail && <p className="mb-0 mt-1">{event.detail}</p>}
                {event.responsible && (
                  <div className="text-muted small mt-1">Responsável: {event.responsible}</div>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(confirmacao)}
        title={confirmacao?.tipo === "enviar" ? "Enviar demanda" : "Reenviar item"}
        confirmLabel={confirmacao?.tipo === "enviar" ? "Confirmar envio" : "Confirmar reenvio"}
        confirmVariant="success"
        loading={enviando || Boolean(reenviandoId)}
        onClose={() => setConfirmacao(null)}
        onConfirm={() => {
          if (confirmacao?.tipo === "enviar") handleEnviar();
          if (confirmacao?.tipo === "reenviar") handleReenviarItem(confirmacao.item.id);
        }}
      >
        {confirmacao?.tipo === "enviar" ? (
          <p className="mb-0">
            Confirma o envio desta demanda para validação? Depois do envio, o rascunho não poderá ser editado.
          </p>
        ) : (
          <p className="mb-0">
            Confirma o reenvio do item <strong>{confirmacao?.item?.nome}</strong> para validação?
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}

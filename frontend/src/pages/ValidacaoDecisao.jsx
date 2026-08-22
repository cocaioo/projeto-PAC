import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import ApiErrorMessage, { InlineMessage } from "../components/ApiErrorMessage";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { Button, Card, EmptyState, LoadingState, Modal, Table, Textarea } from "../components/ui";
import { formatCurrency } from "../utils/format";
import { agruparItensPorDemanda, resultadosDaApi } from "./ValidacoesList";

function atualizarStatus(itens, itemId, status, comentario = "") {
  return itens.map((item) => item.id === itemId
    ? {
        ...item,
        status,
        status_display: status === "validada" ? "Validada" : "Devolvida",
        justificativa_devolucao: status === "devolvida" ? comentario : item.justificativa_devolucao,
      }
    : item);
}

export default function ValidacaoDecisao() {
  const { demandaId } = useParams();
  const { isAdmin } = useAuth();
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [erroDecisao, setErroDecisao] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [itemParaValidar, setItemParaValidar] = useState(null);
  const [itemParaDevolver, setItemParaDevolver] = useState(null);
  const [comentario, setComentario] = useState("");
  const [erroComentario, setErroComentario] = useState("");
  const [decidindoId, setDecidindoId] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      setCarregando(false);
      return undefined;
    }

    let ativo = true;
    setCarregando(true);
    setErro(null);
    api
      .listPendentes()
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
  }, [isAdmin, tentativa]);

  const demanda = useMemo(
    () => agruparItensPorDemanda(itens).find((item) => String(item.id) === String(demandaId)),
    [demandaId, itens]
  );

  function abrirDevolucao(item) {
    setItemParaDevolver(item);
    setComentario("");
    setErroComentario("");
    setErroDecisao(null);
  }

  const fecharModais = useCallback(() => {
    if (decidindoId) return;
    setItemParaValidar(null);
    setItemParaDevolver(null);
    setComentario("");
    setErroComentario("");
    setErroDecisao(null);
  }, [decidindoId]);

  async function decidir(item, acao, justificativa = "") {
    setDecidindoId(item.id);
    setErroDecisao(null);
    setMensagem("");
    try {
      await api.decidirValidacao({
        item_demanda: item.id,
        acao,
        comentario: justificativa,
      });
      const devolvido = acao === "devolvido";
      setItens((atuais) => atualizarStatus(
        atuais,
        item.id,
        devolvido ? "devolvida" : "validada",
        justificativa
      ));
      setMensagem(
        devolvido
          ? `O item ${item.nome} foi devolvido ao solicitante.`
          : `O item ${item.nome} foi validado com sucesso.`
      );
      setItemParaValidar(null);
      setItemParaDevolver(null);
      setComentario("");
      setErroComentario("");
    } catch (error) {
      setErroDecisao(error);
    } finally {
      setDecidindoId(null);
    }
  }

  function confirmarDevolucao() {
    const justificativa = comentario.trim();
    if (!justificativa) {
      setErroComentario("Informe a justificativa para devolver o item.");
      return;
    }
    decidir(itemParaDevolver, "devolvido", justificativa);
  }

  if (!isAdmin) {
    return (
      <div>
        <PageHeader eyebrow="Administração" title="Análise da demanda" />
        <EmptyState
          icon="bi-shield-lock"
          title="Acesso restrito"
          description="Somente administradores podem decidir sobre itens de demandas."
        />
      </div>
    );
  }

  if (carregando) return <LoadingState label="Carregando demanda para análise..." />;

  if (erro) {
    return (
      <ApiErrorMessage
        error={erro}
        title="Não foi possível carregar a demanda"
        onRetry={() => setTentativa((valor) => valor + 1)}
      />
    );
  }

  if (!demanda) {
    return (
      <div>
        <PageHeader eyebrow="Administração" title="Análise da demanda" />
        <EmptyState
          icon="bi-folder-x"
          title="Demanda sem itens pendentes"
          description="A demanda não existe, não pertence ao seu escopo ou já foi analisada."
          action={(
            <Link to="/validacoes" className="pac-button pac-button--secondary">
              Voltar para demandas recebidas
            </Link>
          )}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Administração · Validações"
        title={`Demanda #${demanda.id}`}
        description="Analise cada item separadamente. Uma devolução não impede a decisão dos demais itens."
        actions={(
          <Link to="/validacoes" className="pac-button pac-button--secondary">
            <i className="bi bi-arrow-left me-1" aria-hidden="true" />
            Voltar para validações
          </Link>
        )}
      />

      {mensagem && (
        <InlineMessage variant="success" title="Decisão registrada" onDismiss={() => setMensagem("")}>
          {mensagem}
        </InlineMessage>
      )}

      {erroDecisao && !itemParaValidar && !itemParaDevolver && (
        <ApiErrorMessage error={erroDecisao} title="Não foi possível registrar a decisão" />
      )}

      <Card className="mb-4" title="Dados da demanda" actions={<StatusBadge status={demanda.status} />}>
        <dl className="row mb-0">
          <dt className="col-sm-3">Solicitante</dt>
          <dd className="col-sm-9">{demanda.usuario?.nome || demanda.usuario?.username || "Não informado"}</dd>
          <dt className="col-sm-3">Unidade</dt>
          <dd className="col-sm-9">
            {demanda.unidade?.nome || "Não informada"}
            {demanda.unidade?.sigla ? ` (${demanda.unidade.sigla})` : ""}
          </dd>
          <dt className="col-sm-3">Ano de referência</dt>
          <dd className="col-sm-9">{demanda.anoReferencia || "Não informado"}</dd>
          {demanda.observacao && (
            <>
              <dt className="col-sm-3">Observação</dt>
              <dd className="col-sm-9">{demanda.observacao}</dd>
            </>
          )}
        </dl>
      </Card>

      <Card title="Itens para análise">
        <Table caption={`Itens da demanda ${demanda.id}`}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Grupo</th>
              <th>Quantidade</th>
              <th>Valor total</th>
              <th>Status</th>
              <th className="text-end">Decisão</th>
            </tr>
          </thead>
          <tbody>
            {demanda.itens.map((item) => {
              const pendente = item.status === "aguardando_validacao";
              return (
                <tr key={item.id}>
                  <td>
                    <div className="fw-semibold">{item.nome}</div>
                    {item.descricao && <div className="text-muted small">{item.descricao}</div>}
                    {item.justificativa_necessidade && (
                      <div className="small mt-2">
                        <strong>Necessidade:</strong> {item.justificativa_necessidade}
                      </div>
                    )}
                    {item.status === "devolvida" && item.justificativa_devolucao && (
                      <div className="text-danger small mt-2">
                        <strong>Justificativa:</strong> {item.justificativa_devolucao}
                      </div>
                    )}
                  </td>
                  <td>{item.grupo_nome || "Item manual"}</td>
                  <td>{item.quantidade} {item.unidade_medida || ""}</td>
                  <td>{formatCurrency(item.valor_total)}</td>
                  <td><StatusBadge status={item.status} /></td>
                  <td className="text-end">
                    {pendente ? (
                      <div className="d-flex flex-wrap justify-content-end gap-2">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => {
                            setErroDecisao(null);
                            setItemParaValidar(item);
                          }}
                          disabled={Boolean(decidindoId)}
                          aria-label={`Validar item ${item.nome}`}
                        >
                          <i className="bi bi-check-lg" aria-hidden="true" />
                          Validar
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => abrirDevolucao(item)}
                          disabled={Boolean(decidindoId)}
                          aria-label={`Devolver item ${item.nome}`}
                        >
                          <i className="bi bi-arrow-return-left" aria-hidden="true" />
                          Devolver
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted small">Decisão concluída</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <Modal
        open={Boolean(itemParaValidar)}
        title="Confirmar validação"
        onClose={fecharModais}
        footer={(
          <>
            <Button variant="secondary" onClick={fecharModais} disabled={Boolean(decidindoId)}>
              Cancelar
            </Button>
            <Button
              variant="success"
              loading={decidindoId === itemParaValidar?.id}
              onClick={() => decidir(itemParaValidar, "validado")}
            >
              Confirmar validação
            </Button>
          </>
        )}
      >
        <p>Confirma a validação do item <strong>{itemParaValidar?.nome}</strong>?</p>
        <p className="text-muted mb-0">A decisão ficará registrada no histórico da demanda.</p>
        {erroDecisao && <ApiErrorMessage error={erroDecisao} title="Não foi possível validar o item" />}
      </Modal>

      <Modal
        open={Boolean(itemParaDevolver)}
        title="Devolver item ao solicitante"
        onClose={fecharModais}
        footer={(
          <>
            <Button variant="secondary" onClick={fecharModais} disabled={Boolean(decidindoId)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={decidindoId === itemParaDevolver?.id}
              onClick={confirmarDevolucao}
              disabled={Boolean(decidindoId) || !comentario.trim()}
            >
              Confirmar devolução
            </Button>
          </>
        )}
      >
        <p>Explique o que deve ser corrigido no item <strong>{itemParaDevolver?.nome}</strong>.</p>
        <Textarea
          id="justificativa-devolucao"
          label="Justificativa da devolução"
          hint="A justificativa ficará visível para o solicitante."
          value={comentario}
          onChange={(event) => {
            setComentario(event.target.value);
            if (event.target.value.trim()) setErroComentario("");
          }}
          error={erroComentario}
          rows={4}
          required
          autoFocus
        />
        {erroDecisao && <ApiErrorMessage error={erroDecisao} title="Não foi possível devolver o item" />}
      </Modal>
    </div>
  );
}

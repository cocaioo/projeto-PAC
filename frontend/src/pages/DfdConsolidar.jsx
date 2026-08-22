import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import ApiErrorMessage, { InlineMessage } from "../components/ApiErrorMessage";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  LoadingState,
  Modal,
  ProgressSummary,
  Select,
  Table,
} from "../components/ui";
import { formatCurrency } from "../utils/format";

const quantityFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

function normalizeCollection(data) {
  return Array.isArray(data) ? data : data?.results || [];
}

function rowKey(row) {
  return [
    row.ciclo_pac?.id,
    row.grupo_contratacao?.id,
    row.item_catalogo?.id,
  ].join(":");
}

export function sumVisualQuantities(rows) {
  return rows.reduce((total, row) => total + Number(row.quantidade_total || 0), 0);
}

function uniqueById(values) {
  return Array.from(
    new Map(values.filter((value) => value?.id).map((value) => [value.id, value])).values()
  );
}

function UnitDetails({ details = [] }) {
  if (details.length === 0) return null;

  return (
    <details className="consolidacao-details">
      <summary>Detalhar por unidade e solicitante</summary>
      <div className="consolidacao-details__grid">
        {details.map((detail) => (
          <section className="consolidacao-unit" key={detail.unidade?.id}>
            <header className="consolidacao-unit__header">
              <strong>
                {detail.unidade?.sigla ? `${detail.unidade.sigla} — ` : ""}
                {detail.unidade?.nome || "Unidade não informada"}
              </strong>
              <span>
                {quantityFormatter.format(Number(detail.quantidade_total || 0))} em{" "}
                {detail.total_solicitacoes || detail.solicitacoes?.length || 0} solicitação(ões)
              </span>
            </header>
            <ul className="consolidacao-unit__requests">
              {(detail.solicitacoes || []).map((request) => (
                <li key={request.item_id}>
                  <span>
                    <strong>{request.solicitante?.nome || "Solicitante não informado"}</strong>
                    {" · "}Demanda #{request.demanda_id}
                  </span>
                  <span>
                    {quantityFormatter.format(Number(request.quantidade || 0))} ·{" "}
                    {formatCurrency(request.valor_total)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}

export default function DfdConsolidar() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [ciclos, setCiclos] = useState([]);
  const [itens, setItens] = useState([]);
  const [opcoesBase, setOpcoesBase] = useState([]);
  const [selecionados, setSelecionados] = useState([]);
  const [numero, setNumero] = useState("");
  const [ciclo, setCiclo] = useState("");
  const [grupo, setGrupo] = useState("");
  const [itemCatalogo, setItemCatalogo] = useState("");
  const [carregandoCiclos, setCarregandoCiclos] = useState(true);
  const [carregandoItens, setCarregandoItens] = useState(false);
  const [erro, setErro] = useState(null);
  const [erroNumero, setErroNumero] = useState("");
  const [erroFormulario, setErroFormulario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    if (authLoading) return undefined;
    if (!isAdmin) {
      setCarregandoCiclos(false);
      return undefined;
    }

    const controller = new AbortController();
    setCarregandoCiclos(true);
    api.listConsolidationCycles({ signal: controller.signal })
      .then((data) => {
        const nextCycles = normalizeCollection(data);
        setCiclos(nextCycles);
        setCiclo((current) => {
          if (nextCycles.some((entry) => String(entry.id) === current)) return current;
          return nextCycles[0] ? String(nextCycles[0].id) : "";
        });
      })
      .catch((error) => {
        if (error?.code !== "REQUEST_ABORTED") setErro(error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregandoCiclos(false);
      });

    return () => controller.abort();
  }, [authLoading, isAdmin, refreshVersion]);

  useEffect(() => {
    if (authLoading || !isAdmin || !ciclo) {
      setItens([]);
      setCarregandoItens(false);
      return undefined;
    }

    const controller = new AbortController();
    const query = {
      ciclo_pac_id: Number(ciclo),
      grupo_contratacao_id: grupo ? Number(grupo) : undefined,
      item_catalogo_id: itemCatalogo ? Number(itemCatalogo) : undefined,
    };
    setCarregandoItens(true);
    setErro(null);
    api.listEligibleConsolidationItems(query, { signal: controller.signal })
      .then((data) => {
        const nextItems = normalizeCollection(data);
        setItens(nextItems);
        if (!grupo && !itemCatalogo) setOpcoesBase(nextItems);
      })
      .catch((error) => {
        if (error?.code !== "REQUEST_ABORTED") setErro(error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregandoItens(false);
      });

    return () => controller.abort();
  }, [authLoading, ciclo, grupo, isAdmin, itemCatalogo, refreshVersion]);

  const gruposDisponiveis = useMemo(
    () => uniqueById(opcoesBase.map((row) => row.grupo_contratacao)),
    [opcoesBase]
  );
  const itensDisponiveis = useMemo(
    () => uniqueById(
      opcoesBase
        .filter((row) => !grupo || String(row.grupo_contratacao?.id) === grupo)
        .map((row) => row.item_catalogo)
    ),
    [grupo, opcoesBase]
  );
  const itensSelecionados = useMemo(
    () => itens.filter((row) => selecionados.includes(rowKey(row))),
    [itens, selecionados]
  );
  const itemIdsSelecionados = useMemo(
    () => itensSelecionados.flatMap((row) => row.item_ids || []),
    [itensSelecionados]
  );
  const grupoSelecionado = itensSelecionados[0]?.grupo_contratacao?.id;
  const quantidadeSelecionada = sumVisualQuantities(itensSelecionados);
  const valorSelecionado = itensSelecionados.reduce(
    (total, row) => total + Number(row.valor_total_estimado || 0),
    0
  );
  const cicloAtual = ciclos.find((entry) => String(entry.id) === ciclo);

  const itensPorGrupo = useMemo(() => {
    const groups = new Map();
    itens.forEach((row) => {
      const groupId = row.grupo_contratacao?.id;
      if (!groups.has(groupId)) {
        groups.set(groupId, { grupo: row.grupo_contratacao, itens: [] });
      }
      groups.get(groupId).itens.push(row);
    });
    return Array.from(groups.values());
  }, [itens]);

  function resetSelection() {
    setSelecionados([]);
    setErroFormulario("");
  }

  function handleCycleChange(event) {
    setCiclo(event.target.value);
    setGrupo("");
    setItemCatalogo("");
    setOpcoesBase([]);
    setResultado(null);
    resetSelection();
  }

  function handleGroupChange(event) {
    setGrupo(event.target.value);
    setItemCatalogo("");
    resetSelection();
  }

  function handleItemChange(event) {
    setItemCatalogo(event.target.value);
    resetSelection();
  }

  function toggleRow(row) {
    const key = rowKey(row);
    setErroFormulario("");
    setSelecionados((current) => (
      current.includes(key)
        ? current.filter((currentKey) => currentKey !== key)
        : [...current, key]
    ));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setErro(null);
    setErroNumero("");
    setErroFormulario("");
    if (!numero.trim()) {
      setErroNumero("Informe o número do DFD.");
      return;
    }
    if (!ciclo) {
      setErroFormulario("Selecione o ciclo PAC.");
      return;
    }
    if (itemIdsSelecionados.length === 0) {
      setErroFormulario("Selecione ao menos um item elegível.");
      return;
    }
    setConfirmacaoAberta(true);
  }

  async function confirmarConsolidacao() {
    setEnviando(true);
    setErro(null);
    try {
      const response = await api.consolidarDfd({
        numero_dfd: numero.trim(),
        ciclo_pac_id: Number(ciclo),
        item_ids: itemIdsSelecionados,
      });
      setResultado(response);
      setConfirmacaoAberta(false);
      setNumero("");
      setSelecionados([]);
      setRefreshVersion((version) => version + 1);
    } catch (error) {
      setErro(error);
    } finally {
      setEnviando(false);
    }
  }

  if (authLoading) return <LoadingState label="Verificando permissões..." />;

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="Consolidação e DFD" />
        <InlineMessage variant="danger" title="Acesso restrito">
          Apenas usuários com perfil ADMIN podem consolidar itens e vincular DFDs.
        </InlineMessage>
      </>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Administração"
        title="Consolidação e vínculo de DFD"
        description="Agrupe itens validados do mesmo grupo e vincule o número do DFD sem sair desta tela."
        actions={(
          <Link to="/dfds" className="pac-button pac-button--secondary">
            <i className="bi bi-arrow-left me-1" aria-hidden="true" />
            Voltar para DFDs
          </Link>
        )}
      />

      {resultado && (
        <InlineMessage variant="success" title="Consolidação concluída" onDismiss={() => setResultado(null)}>
          <span>
            DFD <strong>{resultado.dfd?.numero}</strong> vinculado a{" "}
            {resultado.itens_vinculados} item(ns).{" "}
          </span>
          {resultado.dfd?.id && <Link to={`/dfds/${resultado.dfd.id}`}>Abrir DFD</Link>}
        </InlineMessage>
      )}
      <ApiErrorMessage
        error={confirmacaoAberta ? null : erro}
        title="Não foi possível consolidar os itens"
      />

      <Card title="Filtros dos itens elegíveis" className="mb-4">
        {carregandoCiclos ? (
          <LoadingState label="Carregando ciclos disponíveis..." />
        ) : ciclos.length === 0 ? (
          <EmptyState
            title="Nenhum ciclo com itens elegíveis"
            description="Não há itens validados e sem DFD no seu escopo administrativo."
            icon="bi-calendar2-check"
          />
        ) : (
          <div className="consolidacao-filters">
            <Select label="Ciclo PAC" value={ciclo} onChange={handleCycleChange}>
              {ciclos.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.ano} · {entry.total_itens_elegiveis} item(ns)
                </option>
              ))}
            </Select>
            <Select label="Grupo de contratação" value={grupo} onChange={handleGroupChange}>
              <option value="">Todos os grupos</option>
              {gruposDisponiveis.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.nome}</option>
              ))}
            </Select>
            <Select label="Item de catálogo" value={itemCatalogo} onChange={handleItemChange}>
              <option value="">Todos os itens</option>
              {itensDisponiveis.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.nome}</option>
              ))}
            </Select>
          </div>
        )}
      </Card>

      {ciclos.length > 0 && (
        <form onSubmit={handleSubmit} noValidate>
          <ProgressSummary
            items={[
              { label: "Etapa 1", value: "Selecionar itens" },
              { label: "Selecionados", value: `${itemIdsSelecionados.length} itens` },
              { label: "Valor total", value: formatCurrency(valorSelecionado) },
            ]}
          />
          <Card
            title="Vínculo do DFD"
            className="mb-4"
            footer={(
              <div className="consolidacao-actions">
                <div aria-live="polite">
                  <strong>{itemIdsSelecionados.length}</strong> solicitação(ões) selecionada(s) ·{" "}
                  {quantityFormatter.format(quantidadeSelecionada)} unidade(s) ·{" "}
                  {formatCurrency(valorSelecionado)}
                </div>
                <Button type="submit" loading={enviando}>
                  Revisar e vincular DFD
                </Button>
              </div>
            )}
          >
            <Input
              label="Número do DFD"
              value={numero}
              onChange={(event) => {
                setNumero(event.target.value);
                setErroNumero("");
              }}
              placeholder="Ex.: 123/2027"
              error={erroNumero}
              required
            />
            {erroFormulario && (
              <InlineMessage variant="danger" title="Revise a seleção">
                {erroFormulario}
              </InlineMessage>
            )}
          </Card>

          {carregandoItens ? (
            <LoadingState label="Carregando itens elegíveis..." />
          ) : itens.length === 0 ? (
            <EmptyState
              title="Nenhum item elegível encontrado"
              description="Ajuste os filtros ou aguarde a validação de novos itens."
              icon="bi-collection"
            />
          ) : (
            <div className="consolidacao-groups">
              {itensPorGrupo.map(({ grupo: currentGroup, itens: groupItems }) => (
                <Card
                  key={currentGroup?.id}
                  title={currentGroup?.nome || "Grupo não informado"}
                  actions={<Badge variant="info">{groupItems.length} item(ns) de catálogo</Badge>}
                >
                  <Table caption={`Itens elegíveis do grupo ${currentGroup?.nome || "não informado"}`}>
                    <thead>
                      <tr>
                        <th scope="col">Selecionar</th>
                        <th scope="col">Item de catálogo</th>
                        <th scope="col">Status</th>
                        <th scope="col">Solicitações</th>
                        <th scope="col">Quantidade total</th>
                        <th scope="col">Valor estimado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupItems.map((row) => {
                        const key = rowKey(row);
                        const otherGroupSelected = Boolean(
                          grupoSelecionado && grupoSelecionado !== row.grupo_contratacao?.id
                        );
                        return (
                          <Fragment key={key}>
                            <tr>
                              <td>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  aria-label={`Selecionar ${row.item_catalogo?.nome} para consolidar`}
                                  checked={selecionados.includes(key)}
                                  disabled={otherGroupSelected}
                                  onChange={() => toggleRow(row)}
                                />
                              </td>
                              <td>
                                <strong className="d-block">{row.item_catalogo?.nome}</strong>
                                <small className="text-muted">
                                  {row.item_catalogo?.codigo_catmat_catser || "Sem código"} ·{" "}
                                  {row.item_catalogo?.unidade_medida}
                                </small>
                              </td>
                              <td><StatusBadge status="validada" /></td>
                              <td>{row.total_solicitacoes}</td>
                              <td>{quantityFormatter.format(Number(row.quantidade_total || 0))}</td>
                              <td>{formatCurrency(row.valor_total_estimado)}</td>
                            </tr>
                            {(row.detalhamento_por_unidade || []).length > 0 && (
                              <tr className="consolidacao-detail-row">
                                <td colSpan="6">
                                  <UnitDetails details={row.detalhamento_por_unidade} />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </Table>
                  {grupoSelecionado && grupoSelecionado !== currentGroup?.id && (
                    <p className="small text-muted mt-3 mb-0">
                      Limpe a seleção do outro grupo para escolher itens deste grupo.
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </form>
      )}

      <Modal
        open={confirmacaoAberta}
        title="Confirmar vínculo do DFD"
        onClose={() => !enviando && setConfirmacaoAberta(false)}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setConfirmacaoAberta(false)} disabled={enviando}>
              Voltar
            </Button>
            <Button onClick={confirmarConsolidacao} loading={enviando}>
              Confirmar vínculo
            </Button>
          </>
        )}
      >
        <p>
          O DFD <strong>{numero.trim()}</strong> será vinculado a{" "}
          <strong>{itemIdsSelecionados.length} solicitação(ões)</strong> do grupo{" "}
          <strong>{itensSelecionados[0]?.grupo_contratacao?.nome}</strong>, no ciclo{" "}
          <strong>{cicloAtual?.ano}</strong>.
        </p>
        <p className="mb-0">Esta ação atualizará o status dos itens imediatamente.</p>
        <div className="mt-3">
          <ApiErrorMessage error={erro} title="Não foi possível vincular o DFD" />
        </div>
      </Modal>
    </div>
  );
}

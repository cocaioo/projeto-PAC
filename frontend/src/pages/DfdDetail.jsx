import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import ApiErrorMessage from "../components/ApiErrorMessage";
import PageHeader from "../components/PageHeader";
import { Card, EmptyState, LoadingState, Table } from "../components/ui";
import { formatCurrency } from "../utils/format";

export default function DfdDetail() {
  const { id } = useParams();
  const [dfd, setDfd] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const [copiado, setCopiado] = useState(false);

  const carregar = useCallback(() => {
    setCarregando(true);
    setErro(null);
    api
      .getDfd(id)
      .then(setDfd)
      .catch(setErro)
      .finally(() => setCarregando(false));
  }, [id]);

  useEffect(() => carregar(), [carregar]);

  if (carregando) return <LoadingState label="Carregando DFD..." />;
  if (erro) return <ApiErrorMessage error={erro} title="Não foi possível carregar o DFD" onRetry={carregar} />;
  if (!dfd) return <EmptyState icon="bi-file-earmark-x" title="DFD não encontrado" description="O documento solicitado não está disponível." />;

  const itens = Array.isArray(dfd.itens) ? dfd.itens : [];

  const handleCopiar = async () => {
    if (!dfd?.numero) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(dfd.numero);
      }
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Ignora erro de clipboard se houver
    }
  };

  const escapeCsvCell = (val) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExportarCsv = () => {
    if (!dfd) return;
    const header = ["Item", "Quantidade", "Valor Unitário Estimado", "Valor Total"];
    const rows = itens.map((item) => {
      const valorUnitario = item.valor_estimado ?? (item.valor_total != null && item.quantidade ? item.valor_total / item.quantidade : "");
      return [
        escapeCsvCell(item.nome),
        escapeCsvCell(item.quantidade),
        escapeCsvCell(valorUnitario),
        escapeCsvCell(item.valor_total ?? ""),
      ].join(",");
    });

    const csvContent = [header.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `dfd-${dfd.numero}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div>
      <PageHeader
        eyebrow="Documentos de formalização"
        title={`DFD ${dfd.numero}`}
        actions={(
          <>
            <button
              type="button"
              className="pac-button pac-button--secondary"
              onClick={handleCopiar}
            >
              <i className={copiado ? "bi bi-check2 text-success me-1" : "bi bi-clipboard me-1"} aria-hidden="true" />
              {copiado ? "Copiado!" : "Copiar número"}
            </button>
            <button
              type="button"
              className="pac-button pac-button--secondary"
              onClick={handleExportarCsv}
            >
              <i className="bi bi-file-earmark-spreadsheet me-1" aria-hidden="true" />
              Exportar CSV
            </button>
            <button
              type="button"
              className="pac-button pac-button--secondary"
              onClick={handleImprimir}
            >
              <i className="bi bi-printer me-1" aria-hidden="true" />
              Imprimir / Salvar PDF
            </button>
            <Link to="/dfds" className="pac-button pac-button--secondary">
              <i className="bi bi-arrow-left me-1" aria-hidden="true" />
              Voltar para DFDs
            </Link>
          </>
        )}
      />

      <Card title="Dados do DFD" className="mb-4"><dl className="row mb-0">
        <dt className="col-sm-3">Grupo</dt>
        <dd className="col-sm-9">{dfd.grupo_nome}</dd>
        <dt className="col-sm-3">Criado por</dt>
        <dd className="col-sm-9">{dfd.criado_por_nome}</dd>
        {dfd.numero_processo && (
          <>
            <dt className="col-sm-3">Processo</dt>
            <dd className="col-sm-9">{dfd.numero_processo}</dd>
          </>
        )}
      </dl></Card>

      <Card title="Itens consolidados">
      {itens.length === 0 ? (
        <EmptyState icon="bi-inbox" title="Nenhum item consolidado" description="Este DFD ainda não possui itens vinculados." />
      ) : (
        <Table caption={`Itens consolidados no DFD ${dfd.numero}`}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qtd.</th>
              <th>Valor total</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id}>
                <td>{item.nome}</td>
                <td>{item.quantidade}</td>
                <td>{formatCurrency(item.valor_total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={2} className="text-end">
                Total
              </th>
              <th>{formatCurrency(dfd.total)}</th>
            </tr>
          </tfoot>
        </Table>
      )}
      </Card>
    </div>
  );
}

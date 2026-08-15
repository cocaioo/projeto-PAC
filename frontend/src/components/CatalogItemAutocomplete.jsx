import { useEffect, useId, useRef, useState } from "react";
import { api } from "../api/client";
import { formatCurrency } from "../utils/format";

export const CATALOG_SEARCH_DELAY = 300;
const EMPTY_IDS = Object.freeze([]);

export default function CatalogItemAutocomplete({
  selectedItem,
  onSelect,
  excludedIds = EMPTY_IDS,
  error,
  disabled = false,
}) {
  const inputId = useId();
  const listboxId = `${inputId}-results`;
  const requestId = useRef(0);
  const [query, setQuery] = useState(selectedItem?.nome || "");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (selectedItem?.nome) setQuery(selectedItem.nome);
  }, [selectedItem?.id, selectedItem?.nome]);

  useEffect(() => {
    const term = query.trim();
    if (selectedItem?.nome === term || term.length < 2 || disabled) {
      setItems([]);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setRequestError("");
      try {
        const data = await api.listCatalogo(
          { q: term, ativo: "true" },
          { signal: controller.signal }
        );
        if (currentRequest !== requestId.current) return;
        const results = data.results || data;
        setItems(results.filter((item) => !excludedIds.includes(item.id)));
        setOpen(true);
      } catch (requestFailure) {
        if (requestFailure?.code !== "REQUEST_ABORTED" && currentRequest === requestId.current) {
          setRequestError(requestFailure.message || "Não foi possível pesquisar o catálogo.");
        }
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    }, CATALOG_SEARCH_DELAY);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [disabled, excludedIds, query, selectedItem?.nome]);

  function handleChange(event) {
    setQuery(event.target.value);
    setOpen(true);
    if (selectedItem) onSelect(null);
  }

  function select(item) {
    setQuery(item.nome);
    setOpen(false);
    onSelect(item);
  }

  return (
    <div className="pac-field position-relative">
      <label className="pac-field__label" htmlFor={inputId}>Pesquisar item no catálogo *</label>
      <input
        id={inputId}
        className="pac-input"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={open && (loading || items.length > 0)}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${inputId}-error` : `${inputId}-hint`}
        autoComplete="off"
        disabled={disabled}
        value={query}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        placeholder="Digite ao menos 2 caracteres do nome ou código"
      />
      <div className="pac-field__hint" id={`${inputId}-hint`}>
        A busca consulta somente itens ativos disponíveis para solicitação.
      </div>
      {error && <div className="pac-field__error" id={`${inputId}-error`} role="alert">{error}</div>}
      {requestError && <div className="pac-field__error" role="alert">{requestError}</div>}
      {open && (loading || items.length > 0) && (
        <div className="list-group position-absolute start-0 end-0 shadow-sm z-3" id={listboxId} role="listbox">
          {loading ? (
            <div className="list-group-item text-muted" role="option" aria-selected="false">Pesquisando...</div>
          ) : items.map((item) => (
            <button
              type="button"
              className="list-group-item list-group-item-action"
              key={item.id}
              role="option"
              aria-selected={selectedItem?.id === item.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(item)}
            >
              <span className="d-flex justify-content-between gap-3">
                <strong>{item.nome}</strong>
                <span>{formatCurrency(item.valor_estimado)}</span>
              </span>
              <span className="small text-muted">
                {item.codigo_catmat_catser || "Sem código"} · {item.grupo_nome}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

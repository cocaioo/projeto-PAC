// Formata um valor numérico como moeda brasileira (R$).
export function formatCurrency(valor) {
  const numero = Number(valor || 0);
  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

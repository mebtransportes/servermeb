/** Normaliza data ISO ou DATE para yyyy-MM-dd. */
export function normalizarDataPagamento(valor?: string | null): string | null {
  if (!valor?.trim()) return null;
  return valor.trim().split("T")[0];
}

/**
 * Data de pagamento ao terceiro: cadastro (`data_pagamento_terceiro`) ou
 * acompanhamento (`data_pagamento`), o que estiver preenchido.
 */
export function resolverDataPagamentoTerceiro(viagem: {
  data_pagamento_terceiro?: string | null;
  data_pagamento?: string | null;
}): string | null {
  return (
    normalizarDataPagamento(viagem.data_pagamento_terceiro) ??
    normalizarDataPagamento(viagem.data_pagamento)
  );
}

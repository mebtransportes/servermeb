/** Normaliza data ISO ou DATE para yyyy-MM-dd. */
export function normalizarDataPagamento(valor?: string | null): string | null {
  if (!valor?.trim()) return null;
  return valor.trim().split("T")[0];
}

/**
 * Data prevista de pagamento/recebimento da viagem (cadastro ou acompanhamento).
 * Considera `data_pagamento` e `data_pagamento_terceiro`.
 */
export function resolverDataPagamentoViagem(viagem: {
  data_pagamento?: string | null;
  data_pagamento_terceiro?: string | null;
}): string | null {
  return (
    normalizarDataPagamento(viagem.data_pagamento) ??
    normalizarDataPagamento(viagem.data_pagamento_terceiro)
  );
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

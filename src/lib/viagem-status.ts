import type { ViagemStatus } from "@/types";

/** Viagens visíveis em Financeiro → Fechamento de viagens. */
export const VIAGEM_STATUS_FECHAMENTO = [
  "FINALIZADO",
  "PAGAMENTO PENDENTE",
] as const satisfies readonly ViagemStatus[];

export type ViagemStatusFechamento = (typeof VIAGEM_STATUS_FECHAMENTO)[number];

export function statusGeraFechamento(status: string): status is ViagemStatusFechamento {
  return (VIAGEM_STATUS_FECHAMENTO as readonly string[]).includes(status);
}

export function statusElegivelComissao(status: string): boolean {
  return statusGeraFechamento(status);
}

export const VIAGEM_STATUS_LABEL: Record<string, string> = {
  "EM ANDAMENTO": "Em andamento",
  "EM CARREGAMENTO": "Em carregamento",
  "EM ROTA": "Em rota",
  "CHEGOU AO DESTINO DE ENTREGA": "Chegou ao destino de entrega",
  "CHEGOU AO DESTINO FINAL": "Chegou ao destino final",
  DESCARREGANDO: "Descarregando",
  "PARADO NA ESTRADA": "Parado na estrada",
  "EM ATRASO": "Em atraso",
  FINALIZADO: "Finalizado",
  "PAGAMENTO PENDENTE": "Pagamento pendente",
  ARQUIVADO: "Arquivado",
};

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
  "EM CARREGAMENTO": "Em carregamento",
  "EM ROTA": "Em rota",
  "EM MANUTENÇÃO": "Em manutenção",
  "AGUARDANDO DESCARGA": "Aguardando descarga",
  "DESCARGA EM ANDAMENTO": "Descarga em andamento",
  FINALIZADO: "Finalizado",
  "PAGAMENTO PENDENTE": "Pagamento pendente",
  ARQUIVADO: "Arquivado",
  "EM ANDAMENTO": "Em andamento",
  DESCARREGANDO: "Descarga em andamento",
  "EM ATRASO": "Em atraso",
  "CHEGOU AO DESTINO DE ENTREGA": "Chegou ao destino de entrega",
  "CHEGOU AO DESTINO FINAL": "Chegou ao destino final",
  "PARADO NA ESTRADA": "Parado na estrada",
};

export const VIAGEM_STATUS_CORES: Record<string, string> = {
  "EM CARREGAMENTO": "bg-amber-900/50 text-amber-300",
  "EM ROTA": "bg-cyan-900/50 text-cyan-300",
  "EM MANUTENÇÃO": "bg-rose-900/50 text-rose-300",
  "AGUARDANDO DESCARGA": "bg-violet-900/50 text-violet-300",
  "DESCARGA EM ANDAMENTO": "bg-orange-900/50 text-orange-300",
  FINALIZADO: "bg-emerald-900/50 text-emerald-300",
  "PAGAMENTO PENDENTE": "bg-amber-900/50 text-amber-300",
  ARQUIVADO: "bg-slate-700/50 text-slate-400",
  "EM ANDAMENTO": "bg-blue-900/50 text-blue-300",
  DESCARREGANDO: "bg-orange-900/50 text-orange-300",
  "EM ATRASO": "bg-rose-900/50 text-rose-300",
  "CHEGOU AO DESTINO DE ENTREGA": "bg-purple-900/50 text-purple-300",
  "CHEGOU AO DESTINO FINAL": "bg-indigo-900/50 text-indigo-300",
  "PARADO NA ESTRADA": "bg-red-900/50 text-red-300",
};

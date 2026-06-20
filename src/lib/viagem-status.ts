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
  AGENDADA: "Agendada",
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

/** Badges coloridos (tema claro) — acompanhamento e listagens */
export const VIAGEM_STATUS_CORES: Record<string, string> = {
  AGENDADA: "bg-indigo-100 text-indigo-800",
  "EM CARREGAMENTO": "bg-amber-100 text-amber-800",
  "EM ROTA": "bg-sky-100 text-sky-800",
  "EM MANUTENÇÃO": "bg-rose-100 text-rose-800",
  "AGUARDANDO DESCARGA": "bg-violet-100 text-violet-800",
  "DESCARGA EM ANDAMENTO": "bg-orange-100 text-orange-800",
  FINALIZADO: "bg-emerald-100 text-emerald-800",
  "PAGAMENTO PENDENTE": "bg-amber-100 text-amber-900",
  ARQUIVADO: "bg-slate-100 text-slate-600",
  "EM ANDAMENTO": "bg-blue-100 text-blue-800",
  DESCARREGANDO: "bg-orange-100 text-orange-800",
  "EM ATRASO": "bg-red-100 text-red-800",
  "CHEGOU AO DESTINO DE ENTREGA": "bg-purple-100 text-purple-800",
  "CHEGOU AO DESTINO FINAL": "bg-indigo-100 text-indigo-800",
  "PARADO NA ESTRADA": "bg-red-100 text-red-800",
};

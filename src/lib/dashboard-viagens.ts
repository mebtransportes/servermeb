import { VIAGEM_STATUS_FILTRO_ACOMPANHAMENTO } from "@/lib/viagem-validation";

export type ViagemResumo = {
  id: string;
  status: string;
  created_at: string;
};

export const STATUS_CARDS = [...VIAGEM_STATUS_FILTRO_ACOMPANHAMENTO];

/** Status considerados em operação (viagem ainda em curso). */
export const STATUS_EM_OPERACAO = [
  "AGENDADA",
  "EM CARREGAMENTO",
  "EM ROTA",
  "EM MANUTENÇÃO",
  "AGUARDANDO DESCARGA",
  "DESCARGA EM ANDAMENTO",
] as const;

export type DashboardResumo = {
  total: number;
  ativas: number;
  emOperacao: number;
  arquivadas: number;
  pendencias: number;
};

export function contarPorStatus(viagens: ViagemResumo[]) {
  const counts: Record<string, number> = {};
  for (const s of STATUS_CARDS) counts[s] = 0;
  for (const v of viagens) {
    const status =
      v.status === "DESCARREGANDO" ? "DESCARGA EM ANDAMENTO" : v.status;
    if (status in counts) counts[status]++;
  }
  return counts;
}

export function resumoDashboard(counts: Record<string, number>): DashboardResumo {
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const arquivadas = counts.ARQUIVADO ?? 0;
  const ativas = total - arquivadas;
  const emOperacao = STATUS_EM_OPERACAO.reduce((s, st) => s + (counts[st] ?? 0), 0);
  const pendencias = (counts["PAGAMENTO PENDENTE"] ?? 0) + (counts.AGENDADA ?? 0);

  return { total, ativas, emOperacao, arquivadas, pendencias };
}

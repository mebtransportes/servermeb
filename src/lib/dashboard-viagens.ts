import { VIAGEM_STATUS_FILTRO_ACOMPANHAMENTO } from "@/lib/viagem-validation";

export type ViagemResumo = {
  id: string;
  status: string;
  created_at: string;
};

export const STATUS_CARDS = [...VIAGEM_STATUS_FILTRO_ACOMPANHAMENTO];

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

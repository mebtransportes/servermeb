import {
  format,
  parseISO,
  isValid,
  startOfWeek,
  compareAsc,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { dataNoPeriodoConfig, type PeriodoFiltroState } from "@/lib/frota-filters";
import type { ViagemStatus } from "@/types";

export type AgrupamentoGrafico = "mes" | "semana" | "ano";

export type ViagemResumo = {
  id: string;
  status: ViagemStatus;
  created_at: string;
};

export type PontoGrafico = {
  chave: string;
  label: string;
  total: number;
  crescimentoPct: number | null;
};

const STATUS_CARDS: ViagemStatus[] = [
  "EM ANDAMENTO",
  "EM CARREGAMENTO",
  "EM ROTA",
];

export function contarPorStatus(viagens: ViagemResumo[]) {
  const counts: Record<string, number> = {
    "EM ANDAMENTO": 0,
    "EM CARREGAMENTO": 0,
    "EM ROTA": 0,
  };
  for (const v of viagens) {
    if (v.status in counts) counts[v.status]++;
  }
  return counts;
}

export { STATUS_CARDS };

function chaveAgrupamento(data: Date, agrupamento: AgrupamentoGrafico): string {
  if (agrupamento === "mes") return format(data, "yyyy-MM");
  if (agrupamento === "semana") {
    const inicio = startOfWeek(data, { weekStartsOn: 1 });
    return format(inicio, "yyyy-MM-dd");
  }
  return format(data, "yyyy");
}

function labelAgrupamento(chave: string, agrupamento: AgrupamentoGrafico): string {
  if (agrupamento === "mes") {
    const [y, m] = chave.split("-").map(Number);
    return format(new Date(y, m - 1, 1), "MMM/yy", { locale: ptBR });
  }
  if (agrupamento === "semana") {
    const d = parseISO(chave);
    if (!isValid(d)) return chave;
    return `Sem. ${format(d, "dd/MM", { locale: ptBR })}`;
  }
  return chave;
}

export function agruparViagensGrafico(
  viagens: ViagemResumo[],
  periodo: PeriodoFiltroState,
  agrupamento: AgrupamentoGrafico
): PontoGrafico[] {
  const mapa = new Map<string, number>();

  for (const v of viagens) {
    if (!dataNoPeriodoConfig(v.created_at, periodo)) continue;
    const d = parseISO(v.created_at);
    if (!isValid(d)) continue;
    const chave = chaveAgrupamento(d, agrupamento);
    mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
  }

  const chaves = [...mapa.keys()].sort(compareAsc);
  const pontos: PontoGrafico[] = chaves.map((chave, i) => {
    const total = mapa.get(chave) ?? 0;
    const anterior = i > 0 ? (mapa.get(chaves[i - 1]) ?? 0) : null;
    let crescimentoPct: number | null = null;
    if (anterior != null) {
      crescimentoPct =
        anterior === 0 ? (total > 0 ? 100 : 0) : ((total - anterior) / anterior) * 100;
    }
    return {
      chave,
      label: labelAgrupamento(chave, agrupamento),
      total,
      crescimentoPct,
    };
  });

  return pontos;
}

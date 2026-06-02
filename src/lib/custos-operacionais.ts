import { createClient } from "@/lib/supabase/client";
import { dataNoIntervalo, dataNoPeriodo, type PeriodoFiltro } from "@/lib/frota-filters";
import { parseISO, isValid } from "date-fns";

export type CustosOperacionaisResumo = {
  total: number;
  abastecimentos: number;
  manutencoes: number;
  manutencoesPreventivas: number;
  manutencoesViagem: number;
  abastecimentosFrota: number;
  abastecimentosViagem: number;
  pedagios: number;
  reembolsos: number;
  arla: number;
};

function noPeriodo(dataStr: string, periodo: PeriodoFiltro) {
  return dataNoPeriodo(dataStr, periodo);
}

export async function fetchCustosOperacionais(
  periodo: PeriodoFiltro
): Promise<CustosOperacionaisResumo> {
  const supabase = createClient();

  const resumo: CustosOperacionaisResumo = {
    total: 0,
    abastecimentos: 0,
    manutencoes: 0,
    manutencoesPreventivas: 0,
    manutencoesViagem: 0,
    abastecimentosFrota: 0,
    abastecimentosViagem: 0,
    pedagios: 0,
    reembolsos: 0,
    arla: 0,
  };

  const { data: abastFrota } = await supabase
    .from("frota_abastecimentos")
    .select("valor, data_hora");

  for (const a of abastFrota ?? []) {
    if (!noPeriodo(a.data_hora, periodo)) continue;
    const v = Number(a.valor) || 0;
    resumo.abastecimentosFrota += v;
    resumo.abastecimentos += v;
  }

  const { data: manutFrota } = await supabase
    .from("frota_manutencoes")
    .select("valor_total, data_agendada");

  for (const m of manutFrota ?? []) {
    if (!noPeriodo(m.data_agendada, periodo)) continue;
    const v = Number(m.valor_total) || 0;
    resumo.manutencoesPreventivas += v;
    resumo.manutencoes += v;
  }

  const { data: recursos } = await supabase
    .from("viagem_recursos")
    .select("tipo, valor, realizado_em");

  for (const r of recursos ?? []) {
    if (!noPeriodo(r.realizado_em, periodo)) continue;
    const v = Number(r.valor) || 0;
    switch (r.tipo) {
      case "abastecimento":
        resumo.abastecimentosViagem += v;
        resumo.abastecimentos += v;
        break;
      case "manutencao":
        resumo.manutencoesViagem += v;
        resumo.manutencoes += v;
        break;
      case "pedagio":
        resumo.pedagios += v;
        break;
      case "reembolso":
        resumo.reembolsos += v;
        break;
      case "arla":
        resumo.arla += v;
        break;
    }
  }

  resumo.total =
    resumo.abastecimentos +
    resumo.manutencoes +
    resumo.pedagios +
    resumo.arla;

  return resumo;
}

export type DesempenhoMensal = {
  mesAtual: number;
  mesAnterior: number;
  labelAtual: string;
  labelAnterior: string;
  variacaoPct: number | null;
};

export function calcularDesempenhoMensalDespesas(
  fechamentos: { data_embarque: string; despesas: number }[]
): DesempenhoMensal {
  const agora = new Date();
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();
  const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
  const anoAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;

  let totalAtual = 0;
  let totalAnterior = 0;

  for (const f of fechamentos) {
    const d = parseISO(f.data_embarque);
    if (!isValid(d)) continue;
    if (d.getFullYear() === anoAtual && d.getMonth() === mesAtual) {
      totalAtual += f.despesas;
    } else if (d.getFullYear() === anoAnterior && d.getMonth() === mesAnterior) {
      totalAnterior += f.despesas;
    }
  }

  const variacaoPct =
    totalAnterior === 0
      ? totalAtual > 0
        ? 100
        : 0
      : ((totalAtual - totalAnterior) / totalAnterior) * 100;

  const fmt = (m: number, y: number) =>
    new Date(y, m, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return {
    mesAtual: totalAtual,
    mesAnterior: totalAnterior,
    labelAtual: fmt(mesAtual, anoAtual),
    labelAnterior: fmt(mesAnterior, anoAnterior),
    variacaoPct,
  };
}

export function filtrarFechamentosPorPeriodo<
  T extends { data_embarque: string },
>(items: T[], periodo: PeriodoFiltro): T[] {
  if (periodo === "todos") return items;
  return items.filter((f) => dataNoPeriodo(f.data_embarque, periodo));
}

export function filtrarFechamentosIntervalo<
  T extends { data_embarque: string },
>(items: T[], de: string, ate: string): T[] {
  if (!de || !ate) return items;
  return items.filter((f) => dataNoIntervalo(f.data_embarque, de, ate));
}

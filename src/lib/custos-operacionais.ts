import { createClient } from "@/lib/supabase/client";
import {
  dataNoPeriodoConfig,
  formatarMoeda,
  type PeriodoFiltroState,
} from "@/lib/frota-filters";
import { parseISO, isValid } from "date-fns";

function relOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export type CustoOperacionalCategoria =
  | "abastecimentos"
  | "manutencoes"
  | "pedagios"
  | "reembolsos"
  | "arla"
  | "outros";

export type CustoOperacionalLinha = {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  origem: string;
  detalhe?: string;
};

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
  outros: number;
  linhas: Record<CustoOperacionalCategoria, CustoOperacionalLinha[]>;
};

function isArlaCombustivel(tipo?: string | null) {
  return (tipo ?? "").trim().toLowerCase() === "arla";
}

export async function fetchCustosOperacionais(
  periodo: PeriodoFiltroState
): Promise<CustosOperacionaisResumo> {
  const supabase = createClient();

  const linhas: Record<CustoOperacionalCategoria, CustoOperacionalLinha[]> = {
    abastecimentos: [],
    manutencoes: [],
    pedagios: [],
    reembolsos: [],
    arla: [],
    outros: [],
  };

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
    outros: 0,
    linhas,
  };

  const { data: abastFrota } = await supabase
    .from("frota_abastecimentos")
    .select("id, valor, data_hora, veiculos(nome, placa), postos(nome)")
    .order("data_hora", { ascending: false });

  for (const a of abastFrota ?? []) {
    if (!dataNoPeriodoConfig(a.data_hora, periodo)) continue;
    const v = Number(a.valor) || 0;
    const veic = relOne(a.veiculos as { nome: string; placa: string } | { nome: string; placa: string }[] | null);
    const posto = relOne(a.postos as { nome: string } | { nome: string }[] | null);
    resumo.abastecimentosFrota += v;
    resumo.abastecimentos += v;
    linhas.abastecimentos.push({
      id: `frota-abast-${a.id}`,
      data: a.data_hora,
      descricao: veic ? `${veic.nome} — ${veic.placa}` : "Abastecimento frota",
      valor: v,
      origem: "Frota",
      detalhe: posto?.nome,
    });
  }

  const { data: manutFrota } = await supabase
    .from("frota_manutencoes")
    .select("id, valor_total, data_agendada, nome, veiculos(nome, placa), oficinas(nome)")
    .order("data_agendada", { ascending: false });

  for (const m of manutFrota ?? []) {
    if (!dataNoPeriodoConfig(m.data_agendada, periodo)) continue;
    const v = Number(m.valor_total) || 0;
    const veic = relOne(m.veiculos as { nome: string; placa: string } | { nome: string; placa: string }[] | null);
    const oficina = relOne(m.oficinas as { nome: string } | { nome: string }[] | null);
    resumo.manutencoesPreventivas += v;
    resumo.manutencoes += v;
    linhas.manutencoes.push({
      id: `frota-manut-${m.id}`,
      data: m.data_agendada,
      descricao: m.nome ?? "Manutenção preventiva",
      valor: v,
      origem: "Frota preventiva",
      detalhe: [veic?.placa, oficina?.nome].filter(Boolean).join(" · "),
    });
  }

  const { data: recursos } = await supabase
    .from("viagem_recursos")
    .select(
      "id, tipo, valor, realizado_em, descricao, combustivel_tipo, viagens(motoristas(nome_completo), veiculos(nome, placa))"
    )
    .order("realizado_em", { ascending: false });

  for (const r of recursos ?? []) {
    if (!dataNoPeriodoConfig(r.realizado_em, periodo)) continue;
    const v = Number(r.valor) || 0;
    const viagemRaw = relOne(
      r.viagens as
        | {
            motoristas: { nome_completo: string } | { nome_completo: string }[] | null;
            veiculos: { nome: string; placa: string } | { nome: string; placa: string }[] | null;
          }
        | {
            motoristas: { nome_completo: string } | { nome_completo: string }[] | null;
            veiculos: { nome: string; placa: string } | { nome: string; placa: string }[] | null;
          }[]
        | null
    );
    const motorista = relOne(viagemRaw?.motoristas ?? null)?.nome_completo;
    const veiculoInfo = relOne(viagemRaw?.veiculos ?? null);
    const veiculo = veiculoInfo
      ? `${veiculoInfo.nome} — ${veiculoInfo.placa}`
      : undefined;
    const detalhe = [motorista, veiculo, r.descricao].filter(Boolean).join(" · ");

    if (r.tipo === "abastecimento" && isArlaCombustivel(r.combustivel_tipo)) {
      resumo.arla += v;
      linhas.arla.push({
        id: r.id,
        data: r.realizado_em,
        descricao: `Arla — ${r.combustivel_tipo}`,
        valor: v,
        origem: "Viagem",
        detalhe,
      });
      continue;
    }

    switch (r.tipo) {
      case "abastecimento":
        resumo.abastecimentosViagem += v;
        resumo.abastecimentos += v;
        linhas.abastecimentos.push({
          id: r.id,
          data: r.realizado_em,
          descricao: r.combustivel_tipo
            ? `Abastecimento — ${r.combustivel_tipo}`
            : "Abastecimento",
          valor: v,
          origem: "Viagem",
          detalhe,
        });
        break;
      case "manutencao":
        resumo.manutencoesViagem += v;
        resumo.manutencoes += v;
        linhas.manutencoes.push({
          id: r.id,
          data: r.realizado_em,
          descricao: r.descricao ?? "Manutenção em viagem",
          valor: v,
          origem: "Viagem",
          detalhe,
        });
        break;
      case "pedagio":
        resumo.pedagios += v;
        linhas.pedagios.push({
          id: r.id,
          data: r.realizado_em,
          descricao: r.descricao ?? "Pedágio",
          valor: v,
          origem: "Viagem",
          detalhe,
        });
        break;
      case "reembolso":
        resumo.reembolsos += v;
        linhas.reembolsos.push({
          id: r.id,
          data: r.realizado_em,
          descricao: r.descricao ?? "Reembolso",
          valor: v,
          origem: "Viagem",
          detalhe,
        });
        break;
      case "arla":
        resumo.arla += v;
        linhas.arla.push({
          id: r.id,
          data: r.realizado_em,
          descricao: "Arla",
          valor: v,
          origem: "Viagem",
          detalhe,
        });
        break;
      case "estacionamento":
      case "seguro":
      case "monitoramento":
        resumo.outros += v;
        linhas.outros.push({
          id: r.id,
          data: r.realizado_em,
          descricao: r.descricao ?? r.tipo,
          valor: v,
          origem: "Viagem",
          detalhe,
        });
        break;
    }
  }

  resumo.total =
    resumo.abastecimentos +
    resumo.manutencoes +
    resumo.pedagios +
    resumo.arla +
    resumo.outros;

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

export function filtrarPorPeriodoConfig<T extends { data_embarque: string }>(
  items: T[],
  periodo: PeriodoFiltroState
): T[] {
  return items.filter((f) => dataNoPeriodoConfig(f.data_embarque, periodo));
}

export const CUSTO_CATEGORIA_LABEL: Record<CustoOperacionalCategoria, string> = {
  abastecimentos: "Abastecimentos",
  manutencoes: "Manutenções",
  pedagios: "Pedágios",
  reembolsos: "Reembolsos",
  arla: "Arla",
  outros: "Estacionamento / Seguro / Monitoramento",
};

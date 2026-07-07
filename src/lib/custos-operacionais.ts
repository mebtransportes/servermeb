import { createClient } from "@/lib/supabase/client";
import {
  abastecimentoValorLiquidoFromBruto,
} from "@/lib/abastecimento-valor";
import {
  dataNoPeriodoConfig,
  formatarMoeda,
  type PeriodoFiltroState,
} from "@/lib/frota-filters";
import { formatKmBr } from "@/lib/number-format";
import { parseISO, isValid } from "date-fns";
import { isArlaCombustivel, categoriaControleCombustivel } from "@/lib/combustivel-consumo";

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
  | "diesel_comum"
  | "diesel_s500"
  | "outros"
  | "icms";

export type CustoOperacionalLinha = {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  origem: string;
  detalhe?: string;
  /** Valor bruto antes do desconto (abastecimento). */
  valorBruto?: number;
  desconto?: number;
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
  dieselComum: number;
  dieselS500: number;
  outros: number;
  icms: number;
  linhas: Record<CustoOperacionalCategoria, CustoOperacionalLinha[]>;
};

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
    diesel_comum: [],
    diesel_s500: [],
    outros: [],
    icms: [],
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
    dieselComum: 0,
    dieselS500: 0,
    outros: 0,
    icms: 0,
    linhas,
  };

  function registrarControleCombustivel(
    categoria: "arla" | "diesel_comum" | "diesel_s500",
    linha: CustoOperacionalLinha
  ) {
    linhas[categoria].push(linha);
    if (categoria === "arla") resumo.arla += linha.valor;
    else if (categoria === "diesel_comum") resumo.dieselComum += linha.valor;
    else resumo.dieselS500 += linha.valor;
  }

  function registrarAbastecimentoOperacional(
    linha: CustoOperacionalLinha,
    origemFrota: boolean
  ) {
    linhas.abastecimentos.push(linha);
    resumo.abastecimentos += linha.valor;
    if (origemFrota) resumo.abastecimentosFrota += linha.valor;
    else resumo.abastecimentosViagem += linha.valor;
  }

  const { data: abastFrota } = await supabase
    .from("frota_abastecimentos")
    .select("id, valor, data_hora, combustivel_tipo, veiculos(nome, placa), postos(nome)")
    .order("data_hora", { ascending: false });

  for (const a of abastFrota ?? []) {
    if (!dataNoPeriodoConfig(a.data_hora, periodo)) continue;
    const v = Number(a.valor) || 0;
    const veic = relOne(a.veiculos as { nome: string; placa: string } | { nome: string; placa: string }[] | null);
    const posto = relOne(a.postos as { nome: string } | { nome: string }[] | null);
    const controle = categoriaControleCombustivel(a.combustivel_tipo);
    const linhaBase: CustoOperacionalLinha = {
      id: `frota-abast-${a.id}`,
      data: a.data_hora,
      descricao: a.combustivel_tipo
        ? `Abastecimento — ${a.combustivel_tipo}`
        : "Abastecimento frota",
      valor: v,
      origem: "Frota",
      detalhe: [veic ? `${veic.nome} — ${veic.placa}` : null, posto?.nome]
        .filter(Boolean)
        .join(" · "),
    };
    if (controle) {
      registrarControleCombustivel(controle, linhaBase);
    } else {
      registrarAbastecimentoOperacional(linhaBase, true);
    }
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
      "id, tipo, valor, realizado_em, descricao, combustivel_tipo, litros, km_abastecimento, teve_desconto_combustivel, valor_desconto_combustivel, postos(nome), viagens(motoristas(nome_completo), veiculos(nome, placa))"
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
    const posto = relOne(r.postos as { nome: string } | { nome: string }[] | null)?.nome;
    const descontoVal = Number(r.valor_desconto_combustivel) || 0;
    const desconto = descontoVal > 0 ? descontoVal : undefined;
    const valorLiquido =
      r.tipo === "abastecimento"
        ? abastecimentoValorLiquidoFromBruto(v, r.valor_desconto_combustivel)
        : v;
    const detalheParts = [motorista, veiculo, posto ? `Posto: ${posto}` : null];
    if (r.tipo === "abastecimento") {
      if (r.litros != null) detalheParts.push(`${Number(r.litros).toLocaleString("pt-BR")} L`);
      if (r.km_abastecimento != null) {
        detalheParts.push(`KM ${formatKmBr(r.km_abastecimento)}`);
      }
    }
    if (r.descricao) detalheParts.push(r.descricao);
    const detalhe = detalheParts.filter(Boolean).join(" · ");

    if (r.tipo === "abastecimento") {
      const controle = categoriaControleCombustivel(r.combustivel_tipo);
      const linhaControle: CustoOperacionalLinha = {
        id: r.id,
        data: r.realizado_em,
        descricao: r.combustivel_tipo
          ? `${isArlaCombustivel(r.combustivel_tipo) ? "Arla" : "Abastecimento"} — ${r.combustivel_tipo}`
          : "Abastecimento",
        valor: controle === "arla" ? v : valorLiquido,
        valorBruto: controle !== "arla" && desconto ? v : undefined,
        origem: "Viagem",
        detalhe,
        desconto: controle !== "arla" ? desconto : undefined,
      };
      if (controle) {
        registrarControleCombustivel(controle, linhaControle);
        continue;
      }
      registrarAbastecimentoOperacional(
        {
          id: r.id,
          data: r.realizado_em,
          descricao: r.combustivel_tipo
            ? `Abastecimento — ${r.combustivel_tipo}`
            : "Abastecimento",
          valor: valorLiquido,
          valorBruto: desconto ? v : undefined,
          origem: "Viagem",
          detalhe,
          desconto,
        },
        false
      );
      continue;
    }

    switch (r.tipo) {
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
      case "descarga":
        resumo.pedagios += v;
        linhas.pedagios.push({
          id: r.id,
          data: r.realizado_em,
          descricao: r.descricao ?? "Descarga",
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
      case "outro":
        resumo.outros += v;
        linhas.outros.push({
          id: r.id,
          data: r.realizado_em,
          descricao: r.descricao ?? "Outra despesa",
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

  const { data: fechamentos } = await supabase
    .from("viagem_fechamentos")
    .select(
      "id, data_embarque, motorista_nome, numero_cte, valor_icms, valor_frete, icms_percent, veiculo_label"
    )
    .order("data_embarque", { ascending: false });

  for (const f of fechamentos ?? []) {
    if (!dataNoPeriodoConfig(f.data_embarque, periodo)) continue;
    const v = Number(f.valor_icms) || 0;
    if (v <= 0) continue;
    resumo.icms += v;
    const pct = Number(f.icms_percent);
    const pctLabel = Number.isFinite(pct) ? `${pct}%` : "—";
    linhas.icms.push({
      id: `fech-icms-${f.id}`,
      data: f.data_embarque,
      descricao: f.numero_cte?.trim()
        ? `ICMS — CT-e ${f.numero_cte.trim()}`
        : "ICMS sobre frete",
      valor: v,
      origem: "Fechamento viagem",
      detalhe: [
        f.motorista_nome,
        f.veiculo_label,
        `Frete ${formatarMoeda(Number(f.valor_frete) || 0)} · ${pctLabel} ICMS`,
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }

  resumo.total =
    resumo.abastecimentos +
    resumo.manutencoes +
    resumo.pedagios +
    resumo.arla +
    resumo.dieselComum +
    resumo.dieselS500 +
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
  diesel_comum: "Diesel Comum",
  diesel_s500: "Diesel S500",
  outros: "Outras despesas / Estacionamento / Seguro / Monitoramento",
  icms: "ICMS (imposto sobre frete)",
};

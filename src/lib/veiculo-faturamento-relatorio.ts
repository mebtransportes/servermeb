import { createClient } from "@/lib/supabase/client";
import { endOfDay, endOfMonth, format, parseISO, startOfDay, startOfMonth } from "date-fns";
import { formatarDataBr } from "@/lib/frota-filters";
import { labelVinculo } from "@/lib/viagem-validation";
import type { RecursoVinculo, Veiculo, VeiculoTipo } from "@/types";

export type VeiculoFaturamentoPeriodoModo = "mes" | "datas" | "todos";

export type VeiculoFaturamentoFiltros = {
  periodoModo: VeiculoFaturamentoPeriodoModo;
  mes: number;
  ano: number;
  dataDe: string;
  dataAte: string;
  vinculo: "" | RecursoVinculo;
  /** `null` = todos do vínculo; array vazio = nenhum; ids = placas escolhidas. */
  veiculoIds: string[] | null;
};

export type VeiculoFaturamentoViagemLinha = {
  viagemId: string;
  saidaEm: string | null;
  numeroCte: string | null;
  motorista: string;
  cliente: string;
  valorFrete: number;
  status: string;
};

export type VeiculoFaturamentoClienteTotal = {
  cliente: string;
  qtdViagens: number;
  total: number;
};

export type VeiculoFaturamentoSecao = {
  veiculoId: string;
  nome: string;
  placa: string;
  vinculo: RecursoVinculo;
  tipo: VeiculoTipo;
  viagens: VeiculoFaturamentoViagemLinha[];
  porCliente: VeiculoFaturamentoClienteTotal[];
  totalBruto: number;
};

export type VeiculoFaturamentoRelatorio = {
  secoes: VeiculoFaturamentoSecao[];
  totalGeralUnico: number;
  qtdViagensUnicas: number;
  periodoLabel: string;
  vinculoLabel: string;
  placasLabel: string;
  de: string;
  ate: string;
};

const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const PAGE_SIZE = 1000;

type VeiculoRef = {
  id: string;
  nome: string;
  placa: string;
  vinculo?: RecursoVinculo | null;
  tipo?: VeiculoTipo | null;
};

function relOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function extrairNomeParceiro(texto: string | null | undefined): string | null {
  const t = (texto ?? "").trim();
  if (!t) return null;
  const sep = t.search(/\s[—–-]\s/);
  if (sep >= 0) {
    const nome = t.slice(0, sep).trim();
    return nome || null;
  }
  return t;
}

function labelClienteEntregas(
  entregas: { ordem: number; local_entrega: string }[] | null | undefined
): string {
  const nomes = [...(entregas ?? [])]
    .sort((a, b) => a.ordem - b.ordem)
    .map((e) => extrairNomeParceiro(e.local_entrega))
    .filter((t): t is string => !!t);
  return nomes.length ? [...new Set(nomes)].join(" · ") : "—";
}

export function intervaloFiltrosFaturamento(
  filtros: VeiculoFaturamentoFiltros
): { de: string; ate: string } | null {
  if (filtros.periodoModo === "todos") return null;
  if (filtros.periodoModo === "mes") {
    const inicio = startOfMonth(new Date(filtros.ano, filtros.mes - 1, 1));
    const fim = endOfMonth(inicio);
    return {
      de: format(inicio, "yyyy-MM-dd"),
      ate: format(fim, "yyyy-MM-dd"),
    };
  }
  return { de: filtros.dataDe, ate: filtros.dataAte };
}

export function labelPeriodoFaturamento(filtros: VeiculoFaturamentoFiltros): string {
  if (filtros.periodoModo === "todos") return "Todos os períodos";
  if (filtros.periodoModo === "mes") {
    return `${MESES_PT[filtros.mes - 1] ?? filtros.mes} de ${filtros.ano}`;
  }
  if (filtros.dataDe && filtros.dataAte) {
    return `${formatarDataBr(filtros.dataDe)} a ${formatarDataBr(filtros.dataAte)}`;
  }
  return "Período personalizado";
}

export function validarFiltrosFaturamento(filtros: VeiculoFaturamentoFiltros): string | null {
  if (filtros.periodoModo !== "datas") return null;
  if (!filtros.dataDe || !filtros.dataAte) {
    return "Informe a data inicial e a data final.";
  }
  if (filtros.dataDe > filtros.dataAte) {
    return "A data inicial não pode ser posterior à data final.";
  }
  return null;
}

function veiculosSelecionados(
  veiculos: Veiculo[],
  filtros: VeiculoFaturamentoFiltros
): Veiculo[] {
  const porVinculo = filtros.vinculo
    ? veiculos.filter((v) => (v.vinculo ?? "frota") === filtros.vinculo)
    : veiculos;
  if (filtros.veiculoIds == null) return porVinculo;
  const ids = new Set(filtros.veiculoIds);
  return porVinculo.filter((v) => ids.has(v.id));
}

function veiculosDaViagem(row: {
  veiculo_id?: string | null;
  veiculos?: VeiculoRef | VeiculoRef[] | null;
  viagem_veiculos?:
    | {
        ordem: number;
        veiculo_id?: string | null;
        veiculos?: VeiculoRef | VeiculoRef[] | null;
      }[]
    | null;
}): VeiculoRef[] {
  const vv = row.viagem_veiculos ?? [];
  const daComposicao = [...vv]
    .sort((a, b) => a.ordem - b.ordem)
    .map((item) => {
      const v = relOne(item.veiculos);
      if (v?.id) return v;
      if (item.veiculo_id) {
        return {
          id: item.veiculo_id,
          nome: "",
          placa: "",
          vinculo: null,
          tipo: null,
        } satisfies VeiculoRef;
      }
      return null;
    })
    .filter((v): v is VeiculoRef => !!v);

  if (daComposicao.length) return daComposicao;

  const fallback = relOne(row.veiculos);
  if (fallback?.id) return [fallback];
  if (row.veiculo_id) {
    return [
      {
        id: row.veiculo_id,
        nome: "",
        placa: "",
        vinculo: null,
        tipo: null,
      },
    ];
  }
  return [];
}

async function fetchViagensPeriodo(intervalo: { de: string; ate: string } | null) {
  const supabase = createClient();
  const select = `
      id, status, saida_em, numero_cte, valor_frete, veiculo_id,
      motoristas ( nome_completo ),
      veiculos ( id, nome, placa, vinculo, tipo ),
      viagem_veiculos ( ordem, veiculo_id, veiculos ( id, nome, placa, vinculo, tipo ) ),
      viagem_entregas ( ordem, local_entrega )
    `;

  const rows: Record<string, unknown>[] = [];
  let from = 0;

  while (true) {
    let query = supabase.from("viagens").select(select);

    if (intervalo) {
      const inicio = startOfDay(parseISO(intervalo.de)).toISOString();
      const fim = endOfDay(parseISO(intervalo.ate)).toISOString();
      query = query.gte("saida_em", inicio).lte("saida_em", fim);
    }

    const { data, error } = await query
      .order("saida_em", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...(page as Record<string, unknown>[]));
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

export async function montarRelatorioFaturamentoVeiculos(
  veiculosCadastro: Veiculo[],
  filtros: VeiculoFaturamentoFiltros
): Promise<VeiculoFaturamentoRelatorio> {
  const selecionados = veiculosSelecionados(veiculosCadastro, filtros);
  const intervalo = intervaloFiltrosFaturamento(filtros);
  const rows = await fetchViagensPeriodo(intervalo);
  const porId = new Map(selecionados.map((v) => [v.id, v]));

  const viagensPorVeiculo = new Map<string, VeiculoFaturamentoViagemLinha[]>();
  for (const v of selecionados) {
    viagensPorVeiculo.set(v.id, []);
  }

  const viagensUnicas = new Map<string, number>();

  for (const row of rows) {
    const viagemId = String(row.id ?? "");
    if (!viagemId) continue;

    const motoristaRaw = row.motoristas as
      | { nome_completo?: string | null }
      | { nome_completo?: string | null }[]
      | null;
    const motorista = relOne(motoristaRaw);

    const linha: VeiculoFaturamentoViagemLinha = {
      viagemId,
      saidaEm: (row.saida_em as string | null) ?? null,
      numeroCte: (row.numero_cte as string | null) ?? null,
      motorista: motorista?.nome_completo?.trim() || "—",
      cliente: labelClienteEntregas(
        row.viagem_entregas as { ordem: number; local_entrega: string }[] | null
      ),
      valorFrete: Number(row.valor_frete) || 0,
      status: String(row.status ?? ""),
    };

    const participantes = veiculosDaViagem(
      row as {
        veiculo_id?: string | null;
        veiculos?: VeiculoRef | VeiculoRef[] | null;
        viagem_veiculos?:
          | {
              ordem: number;
              veiculo_id?: string | null;
              veiculos?: VeiculoRef | VeiculoRef[] | null;
            }[]
          | null;
      }
    );

    let entrouNoRelatorio = false;
    for (const p of participantes) {
      if (!porId.has(p.id)) continue;
      viagensPorVeiculo.get(p.id)?.push(linha);
      entrouNoRelatorio = true;
    }
    if (entrouNoRelatorio) {
      viagensUnicas.set(viagemId, linha.valorFrete);
    }
  }

  const secoes: VeiculoFaturamentoSecao[] = selecionados
    .map((v) => {
      const viagens = viagensPorVeiculo.get(v.id) ?? [];
      const porClienteMap = new Map<string, VeiculoFaturamentoClienteTotal>();
      for (const viagem of viagens) {
        const atual = porClienteMap.get(viagem.cliente) ?? {
          cliente: viagem.cliente,
          qtdViagens: 0,
          total: 0,
        };
        atual.qtdViagens += 1;
        atual.total += viagem.valorFrete;
        porClienteMap.set(viagem.cliente, atual);
      }
      const porCliente = [...porClienteMap.values()].sort((a, b) => b.total - a.total);
      const totalBruto = viagens.reduce((s, viagem) => s + viagem.valorFrete, 0);
      return {
        veiculoId: v.id,
        nome: v.nome,
        placa: v.placa,
        vinculo: v.vinculo ?? "frota",
        tipo: v.tipo,
        viagens,
        porCliente,
        totalBruto,
      };
    })
    .sort((a, b) => b.totalBruto - a.totalBruto || a.placa.localeCompare(b.placa, "pt-BR"));

  const placasLabel =
    filtros.veiculoIds == null
      ? "Todas as placas do vínculo"
      : selecionados.map((v) => v.placa).join(", ") || "—";

  return {
    secoes,
    totalGeralUnico: [...viagensUnicas.values()].reduce((s, n) => s + n, 0),
    qtdViagensUnicas: viagensUnicas.size,
    periodoLabel: labelPeriodoFaturamento(filtros),
    vinculoLabel: filtros.vinculo ? labelVinculo(filtros.vinculo) : "Todos (frota e terceiro)",
    placasLabel,
    de: intervalo?.de ?? "",
    ate: intervalo?.ate ?? "",
  };
}

export function filtrarRelatorioPorVeiculos(
  relatorio: VeiculoFaturamentoRelatorio,
  veiculoIds: string[] | null
): VeiculoFaturamentoRelatorio {
  if (veiculoIds == null) return relatorio;
  const ids = new Set(veiculoIds);
  const secoes = relatorio.secoes.filter((s) => ids.has(s.veiculoId));
  const viagensUnicas = new Map<string, number>();
  for (const secao of secoes) {
    for (const viagem of secao.viagens) {
      viagensUnicas.set(viagem.viagemId, viagem.valorFrete);
    }
  }
  return {
    ...relatorio,
    secoes,
    totalGeralUnico: [...viagensUnicas.values()].reduce((s, n) => s + n, 0),
    qtdViagensUnicas: viagensUnicas.size,
    placasLabel: secoes.map((s) => s.placa).join(", ") || "—",
  };
}

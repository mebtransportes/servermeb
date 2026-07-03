import { createClient } from "@/lib/supabase/client";
import { fetchViagemFechamentos } from "@/lib/fechamento-data";
import { fetchDespesasEmpresariais } from "@/lib/custos-empresariais";
import { valorLiquidoRecursoViagem } from "@/lib/abastecimento-valor";
import { buildGraficoMensalDespesas, type PontoGraficoMensal } from "@/lib/grafico-mensal";

function refData(dataStr: string) {
  return dataStr.includes("T") ? dataStr : `${dataStr}T12:00:00`;
}

/** Itens de gasto operacional (frota + viagem; sem reembolso). */
async function fetchItensGastosOperacionais(): Promise<{ dataRef: string; valor: number }[]> {
  const supabase = createClient();
  const itens: { dataRef: string; valor: number }[] = [];

  const { data: abastFrota } = await supabase
    .from("frota_abastecimentos")
    .select("valor, data_hora");

  for (const a of abastFrota ?? []) {
    itens.push({ dataRef: a.data_hora, valor: Number(a.valor) || 0 });
  }

  const { data: manutFrota } = await supabase
    .from("frota_manutencoes")
    .select("valor_total, data_agendada");

  for (const m of manutFrota ?? []) {
    itens.push({ dataRef: m.data_agendada, valor: Number(m.valor_total) || 0 });
  }

  const { data: recursos } = await supabase
    .from("viagem_recursos")
    .select("tipo, valor, realizado_em, valor_desconto_combustivel");

  for (const r of recursos ?? []) {
    if (r.tipo === "reembolso") continue;
    itens.push({
      dataRef: r.realizado_em,
      valor: valorLiquidoRecursoViagem(r),
    });
  }

  return itens;
}

/** Últimos 6 meses — visão geral: operacional + comissões + despesas administrativas. */
export async function fetchGraficoMensalFinanceiroGeral(): Promise<PontoGraficoMensal[]> {
  const [operacional, fechamentos, despesasCad] = await Promise.all([
    fetchItensGastosOperacionais(),
    fetchViagemFechamentos(),
    fetchDespesasEmpresariais(),
  ]);

  const itens = [...operacional];

  for (const f of fechamentos) {
    itens.push({ dataRef: f.data_embarque, valor: Number(f.comissao_final) || 0 });
  }
  for (const d of despesasCad) {
    itens.push({ dataRef: refData(d.data_despesa), valor: Number(d.valor) });
  }

  return buildGraficoMensalDespesas(itens);
}

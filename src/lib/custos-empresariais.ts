import { createClient } from "@/lib/supabase/client";
import { fetchAbastecimentos, fetchManutencoes } from "@/lib/frota-data";
import { fetchViagemFechamentos } from "@/lib/fechamento-data";
import { dataNoPeriodoConfig, formatarDataBr, formatarMoeda, type PeriodoFiltroState } from "@/lib/frota-filters";
import type { ManutencaoCard, AbastecimentoCard } from "@/types/frota";
import { filtrarPorPeriodoConfig } from "@/lib/custos-operacionais";
import type { SegmentoEmpresarial, DespesaEmpresarial } from "@/types/custos-empresariais";
import { buildGraficoMensalDespesas, type PontoGraficoMensal } from "@/lib/grafico-mensal";

export type LinhaDetalhe = { label: string; valor: number; extra?: string };

export type CustosEmpresariaisResumo = {
  pagamentoMotoristas: number;
  manutencoes: number;
  abastecimentos: number;
  escritorio: number;
  limpeza: number;
  contabilidade: number;
  total: number;
  detalheMotorista: LinhaDetalhe[];
  detalheManutencaoItens: LinhaDetalhe[];
  detalheManutencaoPreventiva: number;
  detalheManutencaoViagem: number;
  detalheAbastecimentoItens: LinhaDetalhe[];
  detalheAbastecimentoFrota: number;
  detalheAbastecimentoViagem: number;
  despesasEscritorio: DespesaEmpresarial[];
  despesasLimpeza: DespesaEmpresarial[];
  despesasContabilidade: DespesaEmpresarial[];
};

export type PontoGraficoEmpresarial = PontoGraficoMensal;

function refData(dataStr: string) {
  return dataStr.includes("T") ? dataStr : `${dataStr}T12:00:00`;
}

function linhaManutencao(m: ManutencaoCard): LinhaDetalhe {
  const tipo = m.source === "preventiva" ? "Preventiva" : "Em viagem";
  const partes = [tipo, formatarDataBr(m.dataRef), m.onde];
  if (m.veiculoPlaca) partes.push(m.veiculoPlaca);
  if (m.motoristaNome) partes.push(m.motoristaNome);
  return {
    label: m.nome?.trim() || m.onde || "Manutenção",
    valor: m.valor,
    extra: partes.join(" · "),
  };
}

function linhaAbastecimento(a: AbastecimentoCard): LinhaDetalhe {
  const tipo = a.source === "manual" ? "Frota" : "Viagem";
  const partes = [tipo, new Date(a.dataHora).toLocaleString("pt-BR")];
  if (a.postoNome) partes.push(a.postoNome);
  if (a.veiculoLabel) partes.push(a.veiculoLabel);
  if (a.motoristaNome) partes.push(a.motoristaNome);
  if (a.desconto != null && a.desconto > 0 && a.valorBruto != null) {
    partes.push(
      `Bruto ${formatarMoeda(a.valorBruto)} − Desconto ${formatarMoeda(a.desconto)}`
    );
  }
  return {
    label: a.descricao?.trim() || a.postoNome || "Abastecimento",
    valor: a.valor,
    extra: partes.join(" · "),
  };
}

export async function fetchDespesasEmpresariais(): Promise<DespesaEmpresarial[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("custos_empresariais_despesas")
    .select("*")
    .order("data_despesa", { ascending: false });

  if (error) {
    console.warn(error.message);
    return [];
  }
  return (data ?? []) as DespesaEmpresarial[];
}

export async function cadastrarDespesaEmpresarial(payload: {
  segmento: SegmentoEmpresarial;
  valor: number;
  quantidade: number;
  nome_item: string;
  onde_comprou: string;
  data_despesa: string;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("custos_empresariais_despesas").insert(payload);
  return error?.message ?? null;
}

export async function excluirDespesaEmpresarial(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("custos_empresariais_despesas").delete().eq("id", id);
  return error?.message ?? null;
}

export async function fetchCustosEmpresariaisResumo(
  periodo: PeriodoFiltroState,
  motoristaId?: string
): Promise<CustosEmpresariaisResumo> {
  const [fechamentos, manutencoes, abastecimentos, despesasCad] = await Promise.all([
    fetchViagemFechamentos(),
    fetchManutencoes(),
    fetchAbastecimentos(),
    fetchDespesasEmpresariais(),
  ]);

  const fechFiltrados = filtrarPorPeriodoConfig(fechamentos, periodo);
  const fechMotorista = motoristaId
    ? fechFiltrados.filter((f) => f.motorista_id === motoristaId)
    : fechFiltrados;

  const pagamentoMotoristas = fechMotorista.reduce(
    (s, f) => s + (Number(f.comissao_final) || 0),
    0
  );

  const detalheMotorista: LinhaDetalhe[] = fechMotorista.map((f) => ({
    label: f.motorista_nome,
    valor: Number(f.comissao_final) || 0,
    extra: [
      formatarDataBr(f.data_embarque.split("T")[0]),
      f.destino ?? f.local_embarque,
    ]
      .filter(Boolean)
      .join(" · "),
  }));

  const manutFiltradas = manutencoes.filter((m) =>
    dataNoPeriodoConfig(refData(m.dataRef), periodo)
  );
  const manutencoesTotal = manutFiltradas.reduce((s, m) => s + m.valor, 0);
  const preventivas = manutFiltradas.filter((m) => m.source === "preventiva");
  const viagemManut = manutFiltradas.filter((m) => m.source === "viagem");

  const detalheManutencaoItens = manutFiltradas
    .map(linhaManutencao)
    .sort((a, b) => b.valor - a.valor);

  const abastFiltrados = abastecimentos.filter((a) =>
    dataNoPeriodoConfig(a.dataHora, periodo)
  );
  const abastecimentosTotal = abastFiltrados.reduce((s, a) => s + a.valor, 0);
  const abastFrota = abastFiltrados.filter((a) => a.source === "manual");
  const abastViagem = abastFiltrados.filter((a) => a.source === "viagem");

  const detalheAbastecimentoItens = abastFiltrados
    .map(linhaAbastecimento)
    .sort((a, b) => b.valor - a.valor);

  const despesasNoPeriodo = despesasCad.filter((d) =>
    dataNoPeriodoConfig(refData(d.data_despesa), periodo)
  );
  const porSegmento = (seg: SegmentoEmpresarial) =>
    despesasNoPeriodo.filter((d) => d.segmento === seg);

  const escritorio = porSegmento("escritorio").reduce((s, d) => s + Number(d.valor), 0);
  const limpeza = porSegmento("limpeza").reduce((s, d) => s + Number(d.valor), 0);
  const contabilidade = porSegmento("contabilidade").reduce((s, d) => s + Number(d.valor), 0);

  return {
    pagamentoMotoristas,
    manutencoes: manutencoesTotal,
    abastecimentos: abastecimentosTotal,
    escritorio,
    limpeza,
    contabilidade,
    total:
      pagamentoMotoristas +
      manutencoesTotal +
      abastecimentosTotal +
      escritorio +
      limpeza +
      contabilidade,
    detalheMotorista,
    detalheManutencaoItens,
    detalheManutencaoPreventiva: preventivas.reduce((s, m) => s + m.valor, 0),
    detalheManutencaoViagem: viagemManut.reduce((s, m) => s + m.valor, 0),
    detalheAbastecimentoItens,
    detalheAbastecimentoFrota: abastFrota.reduce((s, a) => s + a.valor, 0),
    detalheAbastecimentoViagem: abastViagem.reduce((s, a) => s + a.valor, 0),
    despesasEscritorio: porSegmento("escritorio"),
    despesasLimpeza: porSegmento("limpeza"),
    despesasContabilidade: porSegmento("contabilidade"),
  };
}

/** Últimos 6 meses — total empresarial (comissões + manutenção + abast + cadastros). */
export async function fetchGraficoMensalEmpresarial(): Promise<PontoGraficoEmpresarial[]> {
  const [fechamentos, manutencoes, abastecimentos, despesasCad] = await Promise.all([
    fetchViagemFechamentos(),
    fetchManutencoes(),
    fetchAbastecimentos(),
    fetchDespesasEmpresariais(),
  ]);

  const itens: { dataRef: string; valor: number }[] = [];
  for (const f of fechamentos) {
    itens.push({ dataRef: f.data_embarque, valor: Number(f.comissao_final) || 0 });
  }
  for (const man of manutencoes) {
    itens.push({ dataRef: refData(man.dataRef), valor: man.valor });
  }
  for (const a of abastecimentos) {
    itens.push({ dataRef: a.dataHora, valor: a.valor });
  }
  for (const d of despesasCad) {
    itens.push({ dataRef: refData(d.data_despesa), valor: Number(d.valor) });
  }
  return buildGraficoMensalDespesas(itens);
}

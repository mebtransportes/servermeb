export type ViagemFechamento = {
  id: string;
  viagem_id: string;
  viagem_status?: string | null;
  motorista_id: string;
  motorista_nome: string;
  data_embarque: string;
  local_embarque: string;
  veiculo_label: string;
  numero_cte?: string | null;
  destino?: string | null;
  km_total?: number | null;
  consumo_km_litro?: number | null;
  litros_tanque_inicial?: number | null;
  litros_abastecimento_viagem?: number | null;
  abastecimento_litros: number;
  abastecimento_valor: number;
  arla_valor: number;
  manutencao_total: number;
  pedagio_valor: number;
  reembolso_valor: number;
  valor_frete: number;
  frete_liquido: number;
  comissao_final: number;
  icms_percent?: number | null;
  comissao_tipo?: "PERCENTUAL" | "LIQUIDO_TOTAL" | null;
  comissao_percent?: number | null;
  created_at?: string;
  updated_at?: string;
};

export const ICMS_FRETE_PERCENT = 12;
export const COMISSAO_MOTORISTA_PERCENT = 12;

/** Gastos operacionais da viagem (sem reembolso). */
export function totalDespesasFechamento(f: ViagemFechamento) {
  return (
    f.abastecimento_valor +
    f.arla_valor +
    f.manutencao_total +
    f.pedagio_valor
  );
}

function clampPercent(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

export function getIcmsPercent(f: Pick<ViagemFechamento, "icms_percent">) {
  const v = Number(f.icms_percent);
  return Number.isFinite(v) ? clampPercent(v) : ICMS_FRETE_PERCENT;
}

export function getComissaoPercent(
  f: Pick<ViagemFechamento, "comissao_percent" | "comissao_tipo">
) {
  if (f.comissao_tipo === "LIQUIDO_TOTAL") return 100;
  const v = Number(f.comissao_percent);
  return Number.isFinite(v) ? clampPercent(v) : COMISSAO_MOTORISTA_PERCENT;
}

/** Frete líquido: frete bruto menos o ICMS configurado na viagem (padrão 12%). */
export function calcularFreteLiquido(valorFrete: number, icmsPercent: number) {
  return valorFrete * (1 - clampPercent(icmsPercent) / 100);
}

/** Comissão (sem reembolso): % configurado sobre o frete líquido. */
export function calcularTotalComissao(
  freteLiquido: number,
  comissaoPercent: number,
  comissaoTipo?: "PERCENTUAL" | "LIQUIDO_TOTAL" | null
) {
  if (comissaoTipo === "LIQUIDO_TOTAL") return freteLiquido;
  return freteLiquido * (clampPercent(comissaoPercent) / 100);
}

/** Comissão final = total comissão + reembolso ao motorista. */
export function calcularComissaoFinal(totalComissao: number, reembolso: number) {
  return totalComissao + (Number(reembolso) || 0);
}

export function calcularComissionamento(opts: {
  valorFrete: number;
  icmsPercent: number;
  comissaoPercent: number;
  comissaoTipo?: "PERCENTUAL" | "LIQUIDO_TOTAL" | null;
  reembolso: number;
}) {
  const frete_liquido = calcularFreteLiquido(opts.valorFrete, opts.icmsPercent);
  const total_comissao = calcularTotalComissao(
    frete_liquido,
    opts.comissaoPercent,
    opts.comissaoTipo
  );
  const comissao_final = calcularComissaoFinal(total_comissao, opts.reembolso);
  return { frete_liquido, total_comissao, comissao_final };
}

/** Consumo médio: km total da viagem ÷ litros abastecidos (inicial + durante a viagem). */
export function calcularConsumoKmLitro(
  kmTotal: number | null | undefined,
  litrosTotal: number
): number | null {
  const km = Number(kmTotal) || 0;
  const litros = Number(litrosTotal) || 0;
  if (km <= 0 || litros <= 0) return null;
  return Math.round((km / litros) * 100) / 100;
}

export function formatConsumoKmLitro(kmLitro: number | null | undefined): string {
  if (kmLitro == null || !Number.isFinite(kmLitro)) return "—";
  return (
    kmLitro.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " km/L"
  );
}

export type ResumoFechamentosAgrupados = {
  viagens: number;
  km_total: number;
  valor_frete: number;
  frete_liquido: number;
  despesas: number;
  reembolso_valor: number;
  abastecimento_valor: number;
  abastecimento_litros: number;
  comissao_final: number;
};

/** Soma fretes, gastos e comissão de várias viagens para o relatório agrupado. */
export function agruparFechamentosComissao(
  fechamentos: ViagemFechamento[]
): ResumoFechamentosAgrupados {
  return fechamentos.reduce(
    (acc, f) => ({
      viagens: acc.viagens + 1,
      km_total: acc.km_total + (Number(f.km_total) || 0),
      valor_frete: acc.valor_frete + (Number(f.valor_frete) || 0),
      frete_liquido: acc.frete_liquido + (Number(f.frete_liquido) || 0),
      despesas: acc.despesas + totalDespesasFechamento(f),
      reembolso_valor: acc.reembolso_valor + (Number(f.reembolso_valor) || 0),
      abastecimento_valor: acc.abastecimento_valor + (Number(f.abastecimento_valor) || 0),
      abastecimento_litros: acc.abastecimento_litros + (Number(f.abastecimento_litros) || 0),
      comissao_final: acc.comissao_final + (Number(f.comissao_final) || 0),
    }),
    {
      viagens: 0,
      km_total: 0,
      valor_frete: 0,
      frete_liquido: 0,
      despesas: 0,
      reembolso_valor: 0,
      abastecimento_valor: 0,
      abastecimento_litros: 0,
      comissao_final: 0,
    }
  );
}

export function totalComissaoFromFechamento(f: ViagemFechamento) {
  const icms = getIcmsPercent(f);
  const freteLiq = calcularFreteLiquido(Number(f.valor_frete) || 0, icms);
  return calcularTotalComissao(
    freteLiq,
    getComissaoPercent(f),
    (f.comissao_tipo ?? "PERCENTUAL") as "PERCENTUAL" | "LIQUIDO_TOTAL"
  );
}

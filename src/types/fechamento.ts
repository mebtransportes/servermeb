export type ViagemFechamento = {
  id: string;
  viagem_id: string;
  viagem_status?: string | null;
  motorista_id: string;
  motorista_nome: string;
  data_embarque: string;
  chegada_em?: string | null;
  local_embarque: string;
  veiculo_label: string;
  numero_cte?: string | null;
  destino?: string | null;
  km_total?: number | null;
  km_rodado?: number | null;
  km_odometro_inicial?: number | null;
  km_odometro_final?: number | null;
  consumo_km_litro?: number | null;
  litros_tanque_inicial?: number | null;
  litros_abastecimento_viagem?: number | null;
  abastecimento_litros: number;
  abastecimento_valor: number;
  arla_valor: number;
  manutencao_total: number;
  pedagio_valor: number;
  estacionamento_valor?: number;
  pedagio_desconta_motorista?: number;
  km_final_abastecimento?: number | null;
  outros_valor?: number;
  reembolso_valor: number;
  adiantamento_valor?: number;
  valor_frete: number;
  frete_liquido: number;
  comissao_final: number;
  icms_percent?: number | null;
  comissao_tipo?: "PERCENTUAL" | "LIQUIDO_TOTAL" | null;
  comissao_percent?: number | null;
  motorista_terceiro?: boolean;
  valor_carga?: number;
  valor_icms?: number;
  seguro_valor?: number;
  monitoramento_valor?: number;
  created_at?: string;
  updated_at?: string;
};

export const ICMS_FRETE_PERCENT = 12;
export const COMISSAO_MOTORISTA_PERCENT = 12;
export const SEGURO_CARGA_PERCENT = 0.09;
export const MONITORAMENTO_VALOR_FIXO = 160;

/** Gastos operacionais da viagem frota (sem reembolso/adiantamento). */
export function totalDespesasFrota(f: ViagemFechamento) {
  return (
    (Number(f.abastecimento_valor) || 0) +
    (Number(f.arla_valor) || 0) +
    (Number(f.manutencao_total) || 0) +
    (Number(f.pedagio_valor) || 0) +
    (Number(f.estacionamento_valor) || 0) +
    (Number(f.outros_valor) || 0)
  );
}

/** Gastos operacionais viagem terceiro. */
export function totalDespesasTerceiro(f: ViagemFechamento) {
  return (
    (Number(f.seguro_valor) || 0) +
    (Number(f.monitoramento_valor) || 0) +
    (Number(f.outros_valor) || 0)
  );
}

/** Gastos operacionais da viagem (sem reembolso). */
export function totalDespesasFechamento(f: ViagemFechamento) {
  if (f.motorista_terceiro) return totalDespesasTerceiro(f);
  return totalDespesasFrota(f);
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

/** Valor do ICMS sobre o frete bruto. */
export function calcularValorIcms(valorFrete: number, icmsPercent: number) {
  const pct = clampPercent(icmsPercent);
  return Math.round(valorFrete * (pct / 100) * 100) / 100;
}

/** Seguro: 0,09% sobre o valor da carga. */
export function calcularSeguroCarga(valorCarga: number) {
  const base = Number(valorCarga) || 0;
  if (base <= 0) return 0;
  return Math.round(base * (SEGURO_CARGA_PERCENT / 100) * 100) / 100;
}

/** Frete líquido frota: frete bruto menos o ICMS configurado (padrão 12%). */
export function calcularFreteLiquido(valorFrete: number, icmsPercent: number) {
  return valorFrete - calcularValorIcms(valorFrete, icmsPercent);
}

/** Frete líquido terceiro: bruto − ICMS − seguro − monitoramento. */
export function calcularFreteLiquidoTerceiro(opts: {
  valorFrete: number;
  icmsPercent: number;
  seguroValor: number;
  monitoramentoValor: number;
}) {
  const icms = calcularValorIcms(opts.valorFrete, opts.icmsPercent);
  const liquido =
    opts.valorFrete -
    icms -
    (Number(opts.seguroValor) || 0) -
    (Number(opts.monitoramentoValor) || 0);
  return Math.round(liquido * 100) / 100;
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

/** Comissão final = comissão + reembolso − adiantamentos. */
export function calcularComissaoFinal(
  totalComissao: number,
  reembolso: number,
  adiantamento?: number
) {
  const adv = Math.max(0, Number(adiantamento) || 0);
  return (
    Math.round((totalComissao + (Number(reembolso) || 0) - adv) * 100) / 100
  );
}

export function calcularComissionamento(opts: {
  valorFrete: number;
  icmsPercent: number;
  comissaoPercent: number;
  comissaoTipo?: "PERCENTUAL" | "LIQUIDO_TOTAL" | null;
  reembolso: number;
  adiantamento?: number;
  motoristaTerceiro?: boolean;
  seguroValor?: number;
  monitoramentoValor?: number;
  /** @deprecated Pedágio na base — fórmula frota usa frete líquido − todas despesas. */
  pedagioDescontaMotorista?: number;
  totalDespesas?: number;
}) {
  const valor_icms = calcularValorIcms(opts.valorFrete, opts.icmsPercent);
  const despesas =
    opts.totalDespesas ??
    (opts.motoristaTerceiro
      ? (Number(opts.seguroValor) || 0) +
        (Number(opts.monitoramentoValor) || 0)
      : 0);

  if (opts.motoristaTerceiro) {
    const frete_liquido = calcularFreteLiquido(opts.valorFrete, opts.icmsPercent);
    const liquido_repassar = Math.round((frete_liquido - despesas) * 100) / 100;
    return {
      frete_liquido: Math.round(frete_liquido * 100) / 100,
      frete_menos_gastos: liquido_repassar,
      base_comissao: liquido_repassar,
      valor_icms,
      total_comissao: liquido_repassar,
      comissao_bruta: liquido_repassar,
      comissao_final: liquido_repassar,
    };
  }

  const frete_liquido = calcularFreteLiquido(opts.valorFrete, opts.icmsPercent);
  const totalDespesas = opts.totalDespesas ?? despesas;
  const frete_menos_gastos = Math.max(
    0,
    Math.round((frete_liquido - totalDespesas) * 100) / 100
  );
  const comissao_bruta = calcularTotalComissao(
    frete_menos_gastos,
    opts.comissaoPercent,
    opts.comissaoTipo ?? "PERCENTUAL"
  );
  const comissao_final = calcularComissaoFinal(
    comissao_bruta,
    opts.reembolso,
    opts.adiantamento
  );
  return {
    frete_liquido: Math.round(frete_liquido * 100) / 100,
    frete_menos_gastos,
    base_comissao: frete_menos_gastos,
    valor_icms,
    total_comissao: comissao_bruta,
    comissao_bruta,
    comissao_final,
  };
}

/** Consumo médio: km rodado ÷ litros abastecidos na viagem. */
export function calcularConsumoKmLitro(
  kmRodado: number | null | undefined,
  litrosAbastecidos: number
): number | null {
  const km = Number(kmRodado) || 0;
  const litros = Number(litrosAbastecidos) || 0;
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
  km_rodado: number;
  valor_frete: number;
  frete_liquido: number;
  valor_icms: number;
  seguro_valor: number;
  monitoramento_valor: number;
  despesas: number;
  reembolso_valor: number;
  adiantamento_valor: number;
  abastecimento_valor: number;
  abastecimento_litros: number;
  comissao_final: number;
  motorista_terceiro: boolean;
};

/** Soma fretes, gastos e comissão de várias viagens para o relatório agrupado. */
export function agruparFechamentosComissao(
  fechamentos: ViagemFechamento[]
): ResumoFechamentosAgrupados {
  const base = fechamentos.reduce(
    (acc, f) => {
      const icms = getIcmsPercent(f);
      const despesas = totalDespesasFechamento(f);
      const calc = calcularComissionamento({
        valorFrete: Number(f.valor_frete) || 0,
        icmsPercent: icms,
        comissaoPercent: getComissaoPercent(f),
        comissaoTipo: (f.comissao_tipo ?? "PERCENTUAL") as "PERCENTUAL" | "LIQUIDO_TOTAL",
        reembolso: Number(f.reembolso_valor) || 0,
        adiantamento: Number(f.adiantamento_valor) || 0,
        motoristaTerceiro: !!f.motorista_terceiro,
        totalDespesas: despesas,
      });
      return {
        viagens: acc.viagens + 1,
        km_total: acc.km_total + (Number(f.km_rodado ?? f.km_total) || 0),
        km_rodado: acc.km_rodado + (Number(f.km_rodado) || 0),
        valor_frete: acc.valor_frete + (Number(f.valor_frete) || 0),
        frete_liquido: acc.frete_liquido + calc.frete_liquido,
        valor_icms: acc.valor_icms + calc.valor_icms,
        seguro_valor: acc.seguro_valor + (Number(f.seguro_valor) || 0),
        monitoramento_valor:
          acc.monitoramento_valor + (Number(f.monitoramento_valor) || 0),
        despesas: acc.despesas + totalDespesasFechamento(f),
        reembolso_valor: acc.reembolso_valor + (Number(f.reembolso_valor) || 0),
        adiantamento_valor:
          acc.adiantamento_valor + (Number(f.adiantamento_valor) || 0),
        abastecimento_valor:
          acc.abastecimento_valor + (Number(f.abastecimento_valor) || 0),
        abastecimento_litros:
          acc.abastecimento_litros + (Number(f.abastecimento_litros) || 0),
        comissao_final: acc.comissao_final + (Number(f.comissao_final) || 0),
        motorista_terceiro: acc.motorista_terceiro || !!f.motorista_terceiro,
      };
    },
    {
      viagens: 0,
      km_total: 0,
      km_rodado: 0,
      valor_frete: 0,
      frete_liquido: 0,
      valor_icms: 0,
      seguro_valor: 0,
      monitoramento_valor: 0,
      despesas: 0,
      reembolso_valor: 0,
      adiantamento_valor: 0,
      abastecimento_valor: 0,
      abastecimento_litros: 0,
      comissao_final: 0,
      motorista_terceiro: false,
    }
  );
  return base;
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
